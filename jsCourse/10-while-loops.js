let password = "hola";
let userName = "";

while (userName !== password){
    userName = prompt("Mete la password pibe")
}

alert ("Entraste che!");


let factorial = 1;
let number = 5
let original = number;
do {
    factorial = factorial * number
    number--
} while (number > 0);

console.log(original + " factorial is " + factorial);
 