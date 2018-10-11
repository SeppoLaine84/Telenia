var mongoose 			= require('mongoose');
var Schema 				= mongoose.Schema;
var mongoosePaginate 	= require('mongoose-paginate');


var systemSchema = new Schema({
	timestamp: 	Date,
	cpu:		Number,
	mem: 		Number,
}, { minimize: false });


// Node exports
var sysLog	= mongoose.model("sysLog", systemSchema);
module.exports 	= sysLog;