var mongoose 	= require('mongoose');
var Schema 		= mongoose.Schema;
var _ 			= require("underscore");
var log			= require('winston');
var mongo 		= require('mongodb');
var ObjectId 	= mongo.ObjectID;



/****************************************************/
/*				KampanjaKohde Schema				*/
/****************************************************/
var kampanjaKohdeSchema = new Schema({
	status:		{type:String, default:"ES"},	// ES,EI,OK,SU,EV
	report:		String,						// Lisätietoa kentän teksti tallennetaan tänne
	kampanjaID:	Schema.Types.ObjectId,		// Mihin kampajaan osuus kuuluu
	clientID:	Schema.Types.ObjectId,		// Yritys mihin kampnjanosuus kuuluu
	activeUser: Schema.Types.ObjectId,		// Onko joku käyttäjä soittamassa kohteelle 
	customerID: Schema.Types.ObjectId,
	soitettu: 	[{aika:Date, status:String, soittaja:{type:String, default:""}}],
	notHidden: 	{type:Number, default:0},
	//finished: 	{type:Boolean, default:false},
	soitaUudestaan: 			Date,
	soitaUudestaanSetTime:		Date,
	soitaUudestaanMuistutus: 	{type:Boolean, default:true},
	keys: 		[],
	users:		{nimi:String, id: Schema.Types.ObjectId}, 
	payload:[{
		name:	{type:String, default:""},
		value:	{type:String, default:""},
	}],
	
	
}, { minimize: false });



/****************************************************/
/*				Client kohtaiset funktiot			*/
/****************************************************/


kampanjaKohdeSchema.methods.setStatus = function(newStatus, cb) {
	
	this.status = newStatus || "ES";
	this.soitettu.push(new Date());
	this.save(cb);
}

kampanjaKohdeSchema.methods.setCallAgain = function(newTime, cb) {
	this.soitaUudestaan 		= newTime;
	this.soitaUudestaanSetTime 	= new Date();
	this.save(function(err,res){
		if(cb)cb(res);
	});
}

kampanjaKohdeSchema.methods.addUser = function(user, cb) {
	if(this.users.id){
		if(this.users.id.toString() == ObjectId(user.id).toString()){
		
			return 0;
			
		}
		else{
		
			this.users = user;
			this.save(cb);
			return 1;
		} 
	}
	else{
	
		this.users = user;
		this.save(cb);
		return 1;
		
	}
	return 0;
}



kampanjaKohdeSchema.statics.findItemByID = function(itemID, cb) {
	return this.model("KampanjaKohde").findById( itemID , cb);
};


kampanjaKohdeSchema.statics.removeItem = function(itemID, cb) {
	//log.log("info", "finding: ",itemID)	;
	
	this.model("KampanjaKohde").findById( itemID , function(err,itm){
		if(err)log.log("error", err);
		else itm.remove();
		if(cb)cb();
	});
	
};

kampanjaKohdeSchema.statics.getUserItems = function(userID, cb) {

	return this.model("KampanjaKohde").find({
		"users.id": userID,
		notHidden: 	0,
		$and : [
			{ $or : [ { status : "EV" }, { status : "ES" }, { status : "SU" } ] },
		],
	}, cb);
	
};


/****************************************************/
/*				Yleiset client funktiot				*/
/****************************************************/



// Hakee kaikki kohteet kaikista kampanjoista (superadmin)
kampanjaKohdeSchema.statics.getItems = function(cb) {
	return this.model("KampanjaKohde").find({}, cb);
}



// Node exportit
var KampanjaKohde = mongoose.model("KampanjaKohde", kampanjaKohdeSchema);
module.exports = KampanjaKohde;