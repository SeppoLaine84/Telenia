var mongoose 	= require('mongoose');
var Schema 		= mongoose.Schema;

/****************************************************/
var errorGridSchema = new Schema({
	created: 	Date,
	timestamps: [Date],
	meta: 		{},
	count: 		{type:Number, default:1},
	msg:		String,
	checked:	{type: Boolean, default: false},
	send:		{type: Boolean, default: false},
	appVersion: String,
}, { minimize: false });

// Node exports
var eGrid		= mongoose.model("ErrorGrid", errorGridSchema);
module.exports 	= eGrid;