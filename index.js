const Domain = require('./src/domain/domainfo');

// Domain information enumeration
Domain.get("google.com", "./words.txt").then(rslt => console.log(rslt));