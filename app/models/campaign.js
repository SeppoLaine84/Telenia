var mongoose 	= require('mongoose');
var Schema 		= mongoose.Schema;
var log			= require('winston');

// Kampanjan kohde itemi 
var KampanjaKohde 	= require("./campaignItem");

var mongo 			= require('mongodb');
var ObjectId 		= mongo.ObjectID;
/****************************************************/
/*				Kampanja Schema						*/
/****************************************************/
var kampanjaSchema = new Schema({
	
	nimi:		{type:String, default:""},				// Nimi
	kuvaus:		{type:String, default:""},				// Kuvaus
	alkaa:	 	{type: Date, default: Date.now},		// Aloituspäivä
	luotu:		{type: Date, default: Date.now},		// Koska luotu
	kesto:	 	{type: String, default: "1 y"},			// Aloituspäivä
	clientID:		Schema.Types.ObjectId,					// Yrityksen ID
	customerID: 	Schema.Types.ObjectId,					// Yrityksen asiakkaan ID
	customerName: 	{type:String, 	default:""},				
	users:			[{nimi:String, 	id: Schema.Types.ObjectId}],   	// Liitetyt userit kampanjaan
	saved:			{type:Number, 	default:0},
	provisio:		{type:String, 	default:"0.00"},
	hidden: 		{type:Boolean, 	default:false},
	active:			{type:Boolean, 	default:true},
	soitauudestaanOK:{type:Boolean, default:false},
	kampanjanHinta:{type:Number, default:0},
	
	offSiteEnabled:	{type:Boolean, default:false},		// Onko asiakkaalle luotu oma soittokohteiden lisäyssivu
	offSiteID: 		Schema.Types.ObjectId,
	payloadKeys: 	[],						// Kampanjan kohteiden tiedot
}, { minimize: false });



/****************************************************/
/*				Kampanja kohtaiset funktiot			*/
/****************************************************/

// Lisää kampanjan kohteen kampanjaan
kampanjaSchema.methods.addItem = function(campaignItem,cb, nosave){
	this.campaignItems.push(campaignItem);
	if(!nosave)
		this.save(cb);
	else if(cb)cb();
};

kampanjaSchema.methods.addUser = function(user, cb) {
//	log.log('kampanja', 'Lisätään käyttäjä %s kampajaan %s', user.email, this.nimi );
	var already = false;
	this.users.forEach(function(u){
		//console.log("compare : "+user.id+ " to: " + u.id);
		
		if(u.id.toString()=== user.id.toString()){
			//console.log("match : "+user.id+ " to: " + u.id);
			already = true
			
		}
	})
	
	//console.log("already ",already);
	if(!already){
		this.users.push(user);
		this.save(cb);
	}
}

// Poistaa kampanjan kohteen kampanjasta
kampanjaSchema.methods.removeItem = function(campaignItem, cb){
	
	this.campaignItems.remove(campaignItem);
	this.save(cb);
};


// Hakee kampanjan kohteet ID:llä
kampanjaSchema.statics.getItems = function(id, cb){
	//log.log('kampanja', "Haetaan kampajan \"%s\" kohteet", id);
	return this.model("KampanjaKohde").find({ kampanjaID: id }, cb);
};


// Hakee tietyn userin kampanjakohteet ID:llä
kampanjaSchema.statics.getUserItems = function(userid, id, cb){
	//log.log('kampanja', "Haetaan kampajan \"%s\" kohteet", id);
	return this.model("KampanjaKohde").find({ kampanjaID: id, "users.id":userid }, cb);
};

// Hakee kampanjan kohteet
kampanjaSchema.methods.getItems = function(cb){
	//log.log('kampanja', "Haetaan kampajan \"%s\" (%s) kohteet", this.nimi, this._id);
	return this.model("KampanjaKohde").find({ kampanjaID: this._id }, cb);
};


// Hakee asiakkaan tietyn arvon perusteella, esim. customer.findcustomer("vat", "123432-4", cb)
kampanjaSchema.statics.findCampaignsByClientID = function(clientID, cb) {	
	return this.model("Kampanja").find({ clientID: clientID, saved:1, hidden:false}, cb);
};


kampanjaSchema.statics.findCampaignsByUserID = function(userID, cb) {	
	return this.model("Kampanja").find({ "users.id": userID , hidden:false}, cb);
};

// Hakee asiakkaan tietyn arvon perusteella, esim. customer.findcustomer("vat", "123432-4", cb)
kampanjaSchema.statics.findCampaignByID = function(clientID, cb) {	
	return this.model("Kampanja").findById(clientID , cb);
};


kampanjaSchema.statics.findCampaignsByCustomerID = function(customerID, cb) {	
	return this.model("Kampanja").find({customerID:customerID, hidden:false, saved:1}, cb);
};


// Luo kampanjan itemit excel filen datasta
kampanjaSchema.methods.addFromExcel = function(excelObjects, cb) {
	var cid 	= this._id;
	var _self 	= this;
	var kohteet = [];
	if(excelObjects){
		excelObjects.forEach(function(sheet){
			if(sheet.data){
				if(sheet.data.length > 1) {
					var objKeys = sheet.data.splice(0,1)[0];
					var data 	= [];
					var left 	= sheet.data.length;
					var itemsTotal = left;
					var targets = [];
					for(var i = 0; i < sheet.data.length; i++){
						
						var kohde = new KampanjaKohde({
							kampanjaID: cid,
							keys: 		objKeys,
						});
							
						for(var j = 0; j < objKeys.length; j++){
							kohde.payload.push({name:objKeys[j].toLowerCase(),value:sheet.data[i][j] || ""});
						}
						
						kohde.save(function(err,t){
							if(err)log.error(err);
							kohteet.push(t);
							if(left==1){
								log.log("kampanja", "%s uutta kohdetta lisätty kampanjaan \"%s\"", itemsTotal, _self.nimi)
						
								_self.save(function(){
									if(cb)cb(kohteet);
								});
							
							}
							left--;
						});
					}
				
					
				}
				else {
					log.log("error", "Tiedostossa ei ole dataa")
				}
			}
			else {
				
			}
			
		});
	}
	else {
		log.log("error", "Tiedostossa ei ole excel dataa")
	}

};


kampanjaSchema.methods.itemCount = function (cb) {
	this.model("KampanjaKohde").count({ kampanjaID: this._id }, function(err,items){
		if(cb)cb(items);
	});
};


kampanjaSchema.methods.itemCountByUser = function (uid, cb) {
	this.model("KampanjaKohde").count({ "users.id":uid ,kampanjaID: this._id }, function(err,items){
		if(cb)cb(items);
	});
};

/*
kampanjaSchema.set('toJSON', {
    virtuals: true
});
*/
/****************************************************/
/*				Yleiset kampanja funktiot			*/
/****************************************************/


// Hakee kaikki yritykset (superadmin)
kampanjaSchema.statics.getCampaigns = function(cb) {
	this.model("Kampanja").find({}, cb);
}


// Node exports
var Kampanja 	= mongoose.model("Kampanja", kampanjaSchema);
module.exports 	= Kampanja;