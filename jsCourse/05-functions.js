function sum(a, b){
    return a+b;
}

console.log(sum(10, 10)); //20


function product(a, b){
    return a*b;
}

console.log(product(5, 5)); //25

const bigProduct = product(1000, 13454);
console.log(bigProduct)

setTimeout(function(){
    console.log("El tiempoisOver");
},1000);

setTimeout(() => console.log("Arrow"),500);

