const { Sequelize } = require('sequelize');
const { _ } =  require('lodash');
const Faker =  require('faker');
const bcrypt = require('bcrypt');
const saltRounds = 10; // get it from env

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

const user = Conn.define('user', {
   firstName: {
      type: Sequelize.STRING,
      allowNull: false
   },
   lastName: {
      type: Sequelize.STRING,
      allowNull: false
   },
   email: {
      type: Sequelize.STRING,
      allowNull: false
   },
   password: {
      type: Sequelize.STRING,
      allowNull: false
   },
   dob: {
      type: Sequelize.DATE,
      allowNull: false
   },
},{
   uniqueKeys: {
       Items_unique: {
           fields: ['email']
       }
   }
})

//Relation
user.hasMany(event);
event.belongsTo(user);

// let res = user.findAll({
//    include: [{
//      model: event,
//      as: 'events'
//    }]
//  }).then(function(users) {
//    console.log(users[0].dataValues.events)
//  })


// event.findAll({include:[{model:'user'}]})
// .then(events => {
//    console.log(events)
// })


// Conn.sync({force:true}).then(()=>{
//    _.times(5, ()=> {
//       return user.create({
//          firstName: Faker.name.firstName(),
//          lastName: Faker.name.lastName(),
//          email: Faker.internet.email(),
//          password: bcrypt.hashSync(Faker.name.firstName(), saltRounds),
//          dob: Faker.date.past()
//       }).then(user => {
//         console.log(`${user.email} created`)
//         user.createEvent({
//          title: Faker.company.companyName(),
//          description: Faker.company.catchPhrase(),
//          price: Faker.finance.amount(),
//          date: Faker.date.future()
//         })
//         user.createEvent({
//          title: Faker.company.companyName(),
//          description: Faker.company.catchPhrase(),
//          price: Faker.finance.amount(),
//          date: Faker.date.future()
//         })
//       })
//    })
// })

module.exports = Conn;