var mongoose 	= require('mongoose');
var Schema 		= mongoose.Schema;

var appSettings	= require("./../../settings");
var moment		= require("moment");



/****************************************************/
/*				SalesRaporttiEmail Schema			*/
/****************************************************/
var salesGridSchema = new Schema({

	receivers: 		[],
	user: 			String,
	status: 		String,
	asiakas: 		String,
	kampanjanNimi: 	String,
	payloadID:		Schema.Types.ObjectId,
	data:			{},
	sent:			{type:Boolean, default:false},
}, { minimize: false, autoIndex:true });


/****************************************************/
/*				Node exports						*/
/****************************************************/
var salesGrid = mongoose.model("SalesGrid", salesGridSchema);
module.exports 	= salesGrid;