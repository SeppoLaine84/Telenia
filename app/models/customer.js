var mongoose 	= require('mongoose');
var Schema 		= mongoose.Schema;
var appSettings	= require("../../settings");


/****************************************************/
/*			Soittelu yrityksen asiakas Schema		*/
/****************************************************/
var customerSchema = new Schema({
	nimi:		{type:String},						// Yrityksen nimi
	vat:		{type:String,default:""},			// Y-Tunnus
	clientID:	Schema.Types.ObjectId,				// MyyntiPro asiakkaan ID, eli firma kuka soittelee
	subDomain:	{type:String,defailt:""},			// MyyntiPro subdomainin nimi (premium feature=)
	pwd: 		String,								// Asiakkaan kirjatumiseen
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
	
	kampanjat: [Schema.Types.ObjectId],				// Asiakkaan kampanjat

}, { minimize: false });



/****************************************************/
/*				customer kohtaiset funktiot			*/
/****************************************************/

// Lis‰‰ k‰ytt‰j‰n yritykseen
customerSchema.methods.addUser = function(user, cb) {
	var _self 		= this;
	var customerID 	= _self._id;
		
	_self.users.push(user._id);		// Lis‰‰ userin ID yrityksen user listaan
	
	_self.save(function(){
		user.customerID = customerID;	// Tallenna yrityksen ID userin tietoihin
		user.save(cb);
	});
	
};


/****************************************************/
/*				Yleiset customer funktiot				*/
/****************************************************/

// Hakee asiakkaan nimen perusteella
customerSchema.statics.findCustomer = function(customer, cb) {	
	return this.model("Customer").findOne({ nimi: new RegExp(customer, 'i') }, cb);
};

// Hakee asiakkaan tietyn arvon perusteella, esim. customer.findcustomer("vat", "123432-4", cb)
customerSchema.statics.findCustomerByElement = function(searchFrom, customer, cb) {	
	return this.model("Customer").findOne({ searchFrom: new RegExp(customer, 'i') }, cb);
};

// Hakee asiakkaan tietyn arvon perusteella, esim. customer.findcustomer("vat", "123432-4", cb)
customerSchema.statics.findCustomersByClientID = function(clientID, cb) {	
	return this.model("Customer").find({ clientID: clientID }, cb);
};

// Hakee asiakkaan ID:n perusteella
customerSchema.statics.findCustomerByID = function(id, cb) {	
	return this.model("Customer").findById(id, cb);
};

// Poistaa asiakkaan nimen perusteella
customerSchema.statics.removeCustomer = function(customer, _cb) {	
	this.model("Customer").find({ nimi: new RegExp(customer, 'i') }, function(err, cb){
		if(err) throw err;
		cb.forEach(function(cl){
			cl.remove();
		});
	});
};

// Luo asiakas
customerSchema.statics.createCustomer = function(customerData, cb) {
	var _self = this;

	var customer = new this(customerData);
	 
	customer.save(function(rr){
		if(cb)cb(customer);
		return true;
	})
	return false;
};

// Poistaa asiakkaan
customerSchema.statics.removeCustomerByID = function(id, cb){
	this.model("Customer").findById(id, function(err,customer){
		customer.remove();
		if(cb)cb();
	});
};

// Hakee kaikki yritykset (superadmin)
customerSchema.statics.getCustomers = function(cb) {
	this.model("Customer").find({}, cb);
}


// Node exportit
var customer = mongoose.model("Customer", customerSchema);
module.exports = customer;