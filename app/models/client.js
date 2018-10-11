var mongoose 	= require('mongoose');
var Schema 		= mongoose.Schema;

var appSettings	= require("../../settings");
//mongoose.connect(appSettings.db.host+appSettings.db.dbName);
/****************************************************/
/*				Yritys Schema						*/
/****************************************************/
var clientSchema = new Schema({
	nimi:		{type:String, index:{unique:true}},	// Yrityksen nimi
	vat:		{type:String,default:0},			// Y-Tunnus
	subDomain:	{type:String,defailt:""},			// Telenia subdomainin nimi (ei käytössä ja tuskin koskaan tuleekaan)
	yhteystiedot:{									// Yrityksen yhteystiedot
		nimi:		{type: String, default:""},
		puhelin: 	{type: String, default:""},
		email: 		{type: String, default:""},
		
		osoite:{
			katu:			{type: String, default:""},
			katuLisarivi:	{type: String, default:""},
			postinro:		{type: String, default:""},
			kunta:			{type: String, default:""},
		},
		
	},
	sopimus: {												// Yrityksen telenia sopimus
		tyyppi: 	{type:Number, 	default:1},				// Sopimus tyyppi (1 demo)
		alkanut: 	{type:Date,		default:new Date()},	// Koska sopimus alkanut
		kesto:		{type:Number, 	default:30},			// Sopimuksen kesto päivinä
		hinta:		{type:Number, 	default:0},
	},
	
	//customers: 	[Schema.Types.ObjectId],			// Yrityksen asiakkaat
	users: 		[Schema.Types.ObjectId],				// Yrityksen työntekijät
	kampanjat: 	[Schema.Types.ObjectId],				// Yrityksen kampanjat

}, { minimize: false });



/****************************************************/
/*				Client kohtaiset funktiot			*/
/****************************************************/

// Lisää käyttäjän yritykseen
clientSchema.methods.addUser = function(user, cb) {
	var _self 		= this;
	var clientID 	= _self._id;
		
	_self.users.push(user._id);		// Lisää userin ID yrityksen user listaan
	
	_self.save(function(){
		user.clientID = clientID;	// Tallenna yrityksen ID userin tietoihin
		user.save(cb);
	});
	
};

// Poistaa userin yrityksen alaisuudesta
clientSchema.methods.removeUser = function(userID, cb) {	
	this.users.remove(userID);
	this.save(cb);
};

// Hakee yrityksen userit
clientSchema.methods.getUsers = function(cb) {
	this.model("User").find({clientID: this._id}, "-raportti", cb)
}

// Lisää asiakkaan yritykseen
clientSchema.methods.addCustomer = function(id, cb) {
	this.customers.push(id);
	this.save(cb);
	return true;
}



/****************************************************/
/*				Yleiset client funktiot				*/
/****************************************************/

// Hakee yrityksen nimen perusteella
clientSchema.statics.findClient = function(client, cb) {	
	return this.model("Client").findOne({ nimi: new RegExp(client, 'i') }, cb);
};

// Hakee yrityksen tietyn arvon perusteella, esim. Client.findClient("vat", "123432-4", cb)
clientSchema.statics.findClientByElement = function(searchFrom, client, cb) {	
	return this.model("Client").findOne({ searchFrom: new RegExp(client, 'i') }, cb);
};

// Hakee yrityksen tietyn arvon perusteella, esim. Client.findClient("vat", "123432-4", cb)
clientSchema.statics.findClientByID = function(id, cb) {	
	return this.model("Client").findById(id, cb);
};

// Poistaa asiakkaan nimen perusteella
clientSchema.statics.removeClient = function(client, _cb) {	
	this.model("Client").find({ nimi: new RegExp(client, 'i') }, function(err, cb){
		if(err) throw err;
		cb.forEach(function(cl){
			cl.remove();
		});
	});
};

// Luo asiakas
clientSchema.statics.createClient = function(clientData, cb) {
	var _self = this;

	var client = new this(clientData);
	 
	client.save(function(rr){
		if(rr)cb(rr);
		else if(cb)cb(client);
		return true;
	})
	return false;
};

// Lisää user yritykseen
clientSchema.statics.addUserToClient = function(client, user, cb) {
	var _self = this;
	this.model("Client").findOne({ nimi: new RegExp(client, 'i') }, function(er,_client){
		_self.model("User").findUser(user.email, function(err, _user){
			_client.addUser(_user, function(res){
				_client.save(cb);
			})
			
		});
	});
};

// Hakee kaikki yritykset (superadmin)
clientSchema.statics.getClients = function(cb) {
	this.model("Client").find({}, cb);
}

/*
clientSchema.statics.register = function(clientData, cb) {
	this.model("Client").
	
}
*/



// Node exportit
var Client = mongoose.model("Client", clientSchema);
module.exports = Client;