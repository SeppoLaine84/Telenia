var mongoose 	= require('mongoose');
var crypter 	= require("./../helpers/crypter");
var Schema 		= mongoose.Schema;
var oid 		= Schema.Types.ObjectId;
var appSettings	= require("./../../settings");
var moment		= require("moment");

var events = require('./../helpers/events');

/****************************************************/
/*				Notify Schema						*/
/****************************************************/
var notifySchema = new Schema({
	aika: 			Date,							// Koska notify lähetetty
	eiLuettu: 		{type:Boolean, default:true}, 	// Onko notify luettu?
	eiNahty:		{type:Boolean, default:true}, 	// Onko notify nähty jo
	eiPopupped:		{type:Boolean, default:true},	// Onko notify popupattu clientissä
	tyyppi:			String,							// Notifyn tyyppi (warning,success,info jne.)
	userID: 		oid,							// Kenelle userille notify on lähetetty
	otsikko: 		String,							// Notifyn otsikko
	sisalto: 		String,							// Notifyn sisältö
	campaignItemID: Schema.Types.ObjectId,			// Liittyykö notify johonkin kampanjan kohteeseen?
	campaignID:		Schema.Types.ObjectId,			// Liittyykö notify johonkin kampanjaan?
	hidden:			{type:Boolean, default: false},
	
}, { minimize: false });


// Hakee lukemattomat userin notifyt
notifySchema.statics.getUnread = function(userID, cb){
	return Notify.find({userID:userID, eiLuettu: true}, cb);
	
}

// Luo notify
notifySchema.statics.addNotify = function(userID, tyyppi, otsikko, sisalto, cb){

	var notify = new Notify({
		userID:		userID,
		tyyppi: 	tyyppi,
		otsikko: 	otsikko,
		sisalto: 	sisalto,
		aika: 		new Date(),
	});
	
	
	
	notify.save(function(){
		events.emit("NEW NOTIFY", {userID: userID, notifyID:notify._id});
		if(cb)cb(notify);
	});
	
}
// Hakee kaikki notifyt
notifySchema.statics.getNotifys = function(cb){
	return Notify.find({}, cb);
}

notifySchema.methods.setSeen = function(value, cb) {
	this.eiNahty = value;
	this.save(cb);
}

notifySchema.methods.setRead = function(value, cb) {
	this.eiLuettu = value;
	this.save(cb);
}

notifySchema.methods.setPopupped = function(value, cb) {
	this.eiPopupped = value;
	this.save(cb);
}

/****************************************************/
/*				Node exports						*/
/****************************************************/
var Notify = mongoose.model("Notify", notifySchema);
module.exports 	= Notify;