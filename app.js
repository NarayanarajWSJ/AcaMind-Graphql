const express = require('express');
const bodyParser = require('body-parser');
const graphQlHttp = require('express-graphql');
const { buildSchema } = require('graphql');
const db = require('./database/db')
const bcrypt = require('bcrypt');
const saltRounds = 10; // get it from env



const app = express();
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
app.use(bodyParser.json({limit: '5mb'})); 
app.use(bodyParser.raw({limit: '5mb'}) );

var events = []

app.get('/', (req,res,next) => {
    res.send("hello world")
})


app.use('/graphql', graphQlHttp({
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
            password: String!
            dob: Date!
            events: [Event]
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

        type RootQuery {
            events: [Event!],
            users: [User!]
        }

        type RootMutation {
            createEvent(eventInput: EventInput): Event
            createUser(userInput: UserInput): User
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
          },
    },
    rootValue: {
        events: () => {
            return db.models.event.findAll({
                include: [{
                  model: db.models.user,
                  as: 'user'
                }]
              })
        },
        users: () => {
            return db.models.user.findAll({
                include: [{
                  model: db.models.event,
                  as: 'events'
                }]
              })
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
        createUser: async (args) => {
            var checkUser = await db.models.user.findOne({where:{email:args.userInput.email}})
            if(checkUser){
                throw({error: "User mail id already exists"})
            }
            var user = await db.models.user.create({
                firstName: args.userInput.firstName,
                lastName: args.userInput.lastName,
                email: args.userInput.email,
                password: bcrypt.hashSync(args.userInput.password, saltRounds),
                dob: new Date(args.userInput.dob),
            })
            return user.dataValues
        }
    },
    graphiql:true
}))
app.listen(4000);