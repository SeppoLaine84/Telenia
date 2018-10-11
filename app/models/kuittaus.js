var mongoose 	= require('mongoose');
var moment		= require('moment');
var Schema 		= mongoose.Schema;
var events		= require('./../helpers/events');


// Kampanjan kohde itemi 

/****************************************************/
/*				Raportti / Kuittaus Schema			*/
/****************************************************/
var kuittausSchema = new Schema({
	aika: 			{type:Date,default: new Date},
	status:			String,
	userName: 		String,
	customerName: 	String,
	campaingName:	String,
	payloadName:	String,
	saleKuitattu:	{type: Boolean, default:false},
	userID:			Schema.Types.ObjectId,	
	customerID:		Schema.Types.ObjectId,	
	clientID:		Schema.Types.ObjectId,	
	campaignID:		Schema.Types.ObjectId,
	payloadID:		Schema.Types.ObjectId,
}, { minimize: false });


kuittausSchema.pre('save', function(next){
	events.emit("kuittaus.save", this)
	next();
});

// Node exports
var Kuittaus	= mongoose.model("Kuittaus", kuittausSchema);
module.exports 	= Kuittaus;