var Client 			= require('./../models/client');
var mongo 			= require('mongodb');
var ObjectId 		= mongo.ObjectID;

var checker =  function(interval){
		
	setInterval(function(){
		checkSubs();
	}, interval);
	checkSubs();

	function checkSubs() {
		Client.find({}).exec(function(err, clients){
			
		});
	}
}


module.exports = checker;