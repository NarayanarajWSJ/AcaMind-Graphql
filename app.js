const express = require('express');
const bodyParser = require('body-parser');
const graphQlHttp = require('express-graphql');
const { buildSchema } = require('graphql');
const db = require('./database/db')



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
        }

        input EventInput {
            title: String!
            description: String!
            price: Float!
        }

        type RootQuery {
            events: [Event!]
        }

        type RootMutation {
            createEvent(eventInput: EventInput): Event
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
            return db.models.event.findAll()
        },
        createEvent: async (args) => {
            var event = await db.models.event.create({
                title: args.eventInput.title,
                description: args.eventInput.description,
                price: args.eventInput.price,
                date: new Date(),
            })
            console.log(event)
            // var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            // return {...event.dataValues, date: new Date(event.dataValues.date).toLocaleString("en-US",options)}
            return event.dataValues
        }
    },
    graphiql:true
}))
app.listen(4000);