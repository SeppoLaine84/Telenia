var express = require('express')
  , router 	= express.Router()
  , log		= require('winston')
  , jade	= require('jade');

 var uls = require('../helpers/userlevels');
 
  
router.get("/*", function(req, res){
	res.render('templates/'+req.params[0], {userlevelStrings:uls});
});

 
module.exports = router;
   