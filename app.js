const express = require('express');
const bodyParser = require('body-parser');
const graphQlHttp = require('express-graphql');
const { buildSchema } = require('graphql');
const db = require('./database/db')
const bcrypt = require('bcrypt');
const saltRounds = 10; // get it from env
const cors = require('cors')
const jwt = require('jsonwebtoken')
const SECRET_KEY = 'secret!'
var cookieParser = require('cookie-parser')


const app = express();
app.use(cors())
app.use(cookieParser())
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
app.use(bodyParser.json({limit: '5mb'})); 
app.use(bodyParser.raw({limit: '5mb'}) );

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

            type RootQuery {
                events: [Event!],
                users: [User!]
            }

            type RootMutation {
                createEvent(eventInput: EventInput): Event
                createUser(userInput: UserInput): User
                login(authInput: AuthInput): AuthData!
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
            events: async (args,{req,res}) => {
                console.log(req.cookies)
                return db.models.event.findAll({
                    include: [{
                    model: db.models.user,
                    as: 'user'
                    }]
                })
            },
            users: async () => {
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
                        SECRET_KEY,
                        {expiresIn: '1h'}
                    )
                    res.cookie('token',token,{
                        httpOnly: true,
                        secure:false,
                        maxAge: 1000 * 60 * 60 * 24 * 2
                    })
                    // context.res.set('token', token);
                    // console.log(res.cookie('token'))
                    return {token:token, user:theUser, tokenExpiration:1}
                }
            },
            createEvent: async (args) => {
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

app.listen(4000);