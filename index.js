const Domain = require('./src/domain/domaINfo');

// Domain information enumeration
Domain.get("google.com", "./words.txt").then(rslt => console.log(rslt));