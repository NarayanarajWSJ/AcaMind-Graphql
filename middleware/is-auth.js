const jwt = require('jsonwebtoken')
require('dotenv').config()

module.exports = (req, res, next) => {
   const token =  req.cookies.token;
   if(!token){
      req.isAuth = false;
      return next();
   }
   let decodedToken;
   try{
      decodedToken = jwt.verify(token,process.env.SECRET_KEY)
   }catch(err){
      req.isAuth = false;
      return next();
   }
   
   if(!decodedToken){
      req.isAuth = false;
      return next();
   }

   req.isAuth = true;
   req.userId = decodedToken.id
   req.email = decodedToken.email
   return next();

}