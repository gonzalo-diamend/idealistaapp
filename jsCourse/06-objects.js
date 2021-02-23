const cookie = {
    name: "Oreo", 
    isGLutenFree: false,
    "+Yummy": true,
    eatCookie: function (){
        console.log("Estoy comiendo " +  this.name);
    }

};
    cookie.name = "Mana";
    cookie.isGLutenFree = true
    console.log(cookie["+Yummy"])
    console.log(cookie);
    cookie.eatCookie();

   class Cookie {
       constructor (name, isGLutenFree){
           this.name = name;
           this.isGLutenFree = isGLutenFree;
       }

       eatCookie(){
        console.log("Estoy comiendo " +  this.name);
       }
   }
   const myCookie = new Cookie("Merengadas", false);
   
   console.log(myCookie);
   myCookie.eatCookie();


