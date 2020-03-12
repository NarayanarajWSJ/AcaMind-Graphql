const express = require('express');
const bodyParser = require('body-parser');
const graphQlHttp = require('express-graphql');
const { buildSchema } = require('graphql');
const db = require('./database/db')
const bcrypt = require('bcrypt');
const saltRounds = 10; // get it from env
const cors = require('cors')
const jwt = require('jsonwebtoken')
// const SECRET_KEY = 'secret!'
require('dotenv').config()
var cookieParser = require('cookie-parser')
var isAuth = require('./middleware/is-auth')
const { Sequelize } = require('sequelize');


const app = express();
app.use(cors())
app.use(cookieParser())
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
app.use(bodyParser.json({limit: '5mb'})); 
app.use(bodyParser.raw({limit: '5mb'}) );
app.use(isAuth)

var events = []

app.get('/', (req,res,next) => {
    res.send("hello world")
})
app.use(
    '/graphql',
    graphQlHttp((req,res) => {
      return {
        schema: buildSchema(`
            scalar Date

            type Event {
                id: ID!
                title: String!
                description: String!
                price: Float!
                date: Date!
                user: User!
            }

            type User {
                id: ID!
                firstName: String!
                lastName: String!
                email: String!
                dob: Date!
                events: [Event]
            }

            type AuthData {
                user: User
                token: String!
                tokenExpiration: Int!
            }

            input EventInput {
                title: String!
                description: String!
                price: Float!
                userId: ID!
            }

            input UserInput {
                firstName: String!
                lastName: String!
                email: String!
                password: String!
                dob: Date!
            }
            input AuthInput {
                email: String!
                password: String!
            }

            input EventFilterInput {
                id: Int
                title: String
                description: String
                limit: Int
                offset: Int
            }

            type RootQuery {
                allEvents(eventFilterInput: EventFilterInput): [Event!],
                myEvents(eventFilterInput: EventFilterInput): [Event!],
                users: [User!]
                getEventById(id: Int): Event!
            }

            type RootMutation {
                createEvent(eventInput: EventInput): Event
                createUser(userInput: UserInput): User
                login(authInput: AuthInput): AuthData!
                logout: User
            }

            schema {
                query: RootQuery
                mutation: RootMutation
            }
        `),
        resolvers: {
            Date: {
                __parseValue(value) {
                return new Date(value); // value from the client
                },
                __serialize(value) {
                return value.getTime(); // value sent to the client
                },
                __parseLiteral(ast) {
                if (ast.kind === Kind.INT) {
                    return parseInt(ast.value, 10); // ast value is always in string format
                }
                return null;
                }
            }
        },
        rootValue: {
            allEvents: async (args,{req,res}) => {
                checkAuthenticated(req.isAuth);
                let where = {}
                if(args.eventFilterInput && args.eventFilterInput.id) where['id'] = args.eventFilterInput.id
                if(args.eventFilterInput && args.eventFilterInput.title) {
                    where['title'] = {}
                    where['title'][Sequelize.Op.like] = '%' + args.eventFilterInput.title + '%'
                }
                if(args.eventFilterInput && args.eventFilterInput.description){
                    where['description'] = {}
                    where['description'][Sequelize.Op.like] = '%' + args.eventFilterInput.description + '%'
                }
                if(args.eventFilterInput && args.eventFilterInput.limit && args.eventFilterInput.offset){
                    return db.models.event.findAll({
                        where: where,
                        limit: args.eventFilterInput.limit,
                        offset: args.eventFilterInput.offset,
                        include: [{
                            model: db.models.user,
                            as: 'user'
                        }]
                    })
                }else{
                    return db.models.event.findAll({
                        where:where,
                        include: [{
                            model: db.models.user,
                            as: 'user'
                        }]
                    })
                }
            },
            myEvents: async (args,{req,res}) => {
                checkAuthenticated(req.isAuth);
                if(args.eventFilterInput && args.eventFilterInput.limit && args.eventFilterInput.offset){
                    return db.models.event.findAll({
                        limit: args.eventFilterInput.limit,
                        offset: args.eventFilterInput.offset,
                        include: [{
                            model: db.models.user,
                            as: 'user',
                            where:{
                                id: req.userId
                            }
                        }]
                    })
                }else{
                    return db.models.event.findAll({
                        include: [{
                            model: db.models.user,
                            as: 'user',
                            where:{
                                id: req.userId
                            }
                        }]
                    })
                }
            },
            getEventById: async (args,{req,res}) => {
                checkAuthenticated(req.isAuth);
                return db.models.event.findOne({
                    where: {
                        id: args.id
                     },
                    include: [{
                    model: db.models.user,
                    as: 'user'
                    }]
                })
            },
            users: async () => {
                checkAuthenticated(req.isAuth);
                const users = await db.models.user.findAll({
                    include: [{
                    model: db.models.event,
                    as: 'events'
                    }]
                })
                return users;
            },
            login: async (args,{res}) => {
                const theUser = await db.models.user.findOne({
                    where: {
                        email: args.authInput.email
                    }
                });
                if (!theUser) {
                    throw new Error(`Could not find account: ${args.authInput.email}`)
                }else{
                    const match = await bcrypt.compare(args.authInput.password, theUser.password)
                    if (!match) {
                        throw new Error(`In-valid password for the account: ${args.authInput.email}`)
                    }
                    const token = jwt.sign(
                        { email: theUser.email, id: theUser.id },
                        process.env.SECRET_KEY,
                        {expiresIn: '1h'}
                    )
                    res.cookie('token',token,{
                        httpOnly: true,
                        secure:false,
                        maxAge: 1000 * 60 * 60 * 24 * 2
                    })
                    return {token:token, user:theUser, tokenExpiration:1}
                }
            },
            logout: async (args,{req,res}) => {
                console.log(req.isAuth);
                res.clearCookie("token");
                console.log(req.userId);
                req.isAuth = false;
                const user = await db.models.user.findByPk(req.userId)
                req.userId = null;
                return user;
            },
            createEvent: async (args) => {
                checkAuthenticated(req.isAuth);
                var event = await db.models.event.create({
                    title: args.eventInput.title,
                    description: args.eventInput.description,
                    price: args.eventInput.price,
                    date: new Date(),
                    userId: args.eventInput.userId
                })
                return event.dataValues
            },
            createUser: async (args,context) => {
                checkAuthenticated(req.isAuth);
                var checkUser = await db.models.user.findOne({where:{email:args.userInput.email}})
                if(checkUser){
                    throw new Error("User mail id already exists")
                }
                var user = await db.models.user.create({
                    firstName: args.userInput.firstName,
                    lastName: args.userInput.lastName,
                    email: args.userInput.email,
                    password: bcrypt.hashSync(args.userInput.password, saltRounds),
                    dob: new Date(args.userInput.dob),
                })
                return {...user.dataValues,password: ""}
            }
        },
        graphiql:true,
        context:{ req, res }
      };
    }),
  );
function checkAuthenticated(value){
    if(!value){
        throw new Error("User Not Authenticated")
    }
}
app.listen(4000);