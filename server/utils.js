module.exports = {
  makeId,
	findAngle
}

function makeId(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

function findAngle(p0,p1,p2) {
  var a = Math.pow(p1.x-p0.x,2) + Math.pow(p1.y-p0.y,2),
      b = Math.pow(p1.x-p2.x,2) + Math.pow(p1.y-p2.y,2),
      c = Math.pow(p2.x-p0.x,2) + Math.pow(p2.y-p0.y,2);
  return Math.acos( (a+b-c) / Math.sqrt(4*a*b) );
}