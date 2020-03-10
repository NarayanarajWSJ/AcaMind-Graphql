const express = require('express');
const bodyParser = require('body-parser');
const graphQlHttp = require('express-graphql');
const { buildSchema } = require('graphql')



const app = express();
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
app.use(bodyParser.json({limit: '5mb'})); 
app.use(bodyParser.raw({limit: '5mb'}) );

var events = ['one', 'two','three']
app.get('/', (req,res,next) => {
    res.send("hello world")
})


app.use('/graphql', graphQlHttp({
    schema: buildSchema(`
        type RootQuery {
            events: [String!]
        }

        type RootMutation {
            createEvent(name: String): String
        }

        schema {
            query: RootQuery
            mutation: RootMutation
        }
    `),
    rootValue: {
        events: () => {
            return events
        },
        createEvent: (args) => {
            events.push(args.name);
        }
    },
    graphiql:true
}))
app.listen(4000);