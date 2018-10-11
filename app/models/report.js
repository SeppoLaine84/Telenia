var mongoose 	= require('mongoose');
var moment		= require('moment');
var Schema 		= mongoose.Schema;


// Kampanjan kohde itemi 

/****************************************************/
/*				Raportti / Kuittaus Schema			*/
/****************************************************/
var reportSchema = new Schema({
		
	kuittausAika:	Date,
	aikaShort:		{type:String, default:moment().format("DD.MM.YYYY")},
	aikaUnix:		{type:Number, default:moment().format("X")},
	date:			String,
	userID:			Schema.Types.ObjectId,
	clientID:		Schema.Types.ObjectId,
	kampanjaID:		Schema.Types.ObjectId,
	
	userName:		String,
	realUserName:	{type:String, default:""},
	campaignName: 	String,
	
	statuses:		Schema.Types.Mixed,
	tunnit:			String,
	tuntipalkka:	String,
	provisiopalkka: String,
	
	
}, { minimize: false });



/****************************************************/
/*				Kampanja kohtaiset funktiot			*/
/****************************************************/


// Hakee kaikki yritykset (superadmin)
reportSchema.statics.getReports = function(cb) {
	this.model("Raportti").find({}, cb);
}


// Node exports
var Raportti 	= mongoose.model("Raportti", reportSchema);
module.exports 	= Raportti;