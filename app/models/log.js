var mongoose 	= require('mongoose');
var moment		= require('moment');
var Schema 		= mongoose.Schema;
var mongoosePaginate = require('mongoose-paginate');


// Kampanjan kohde itemi 

/****************************************************/
/*				Raportti / Kuittaus Schema			*/
/****************************************************/
var logSchema = new Schema({
	timestamp: 	Date,
	meta: 		{},
	level: 		String,
	msg:		String,
	appVersion: String,
}, { minimize: false });



/****************************************************/
/*				Kampanja kohtaiset funktiot			*/
/****************************************************/


// Hakee kaikki yritykset (superadmin)
logSchema.statics.getLogs = function(cb) {
	this.model("Log").find({}, cb);
}


logSchema.plugin(mongoosePaginate);

// Node exports
var Logs	= mongoose.model("Log", logSchema);
module.exports 	= Logs;