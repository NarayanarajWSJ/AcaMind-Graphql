const { Sequelize } = require('sequelize');
const { _ } =  require('lodash');
const Faker =  require('faker');

const Conn = new Sequelize(
   'events',
   'postgres',
   'postgres',
   {
      dialect: 'postgres',
      host: 'localhost'
   }
);

const event = Conn.define('event', {
   title: {
      type: Sequelize.STRING,
      allowNull: false
   },
   description: {
      type: Sequelize.STRING,
      allowNull: false
   },
   price: {
      type: Sequelize.FLOAT,
      allowNull: false
   },
   date: {
      type: Sequelize.DATE,
      allowNull: false
   },
});


//Relation


// Conn.sync({force:true}).then(()=>{
//    _.times(10, ()=> {
//       return event.create({
//          title: Faker.name.title(),
//          description: Faker.name.jobDescriptor(),
//          price: Faker.commerce.price(),
//          date: Faker.date.past()
//       }).then(event => {
//         console.log(`${event.title} created`)
//       })
//    })
// })

module.exports = Conn;