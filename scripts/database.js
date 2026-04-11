import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";

import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDE3BNbrepcvN5ykhG8BaMM-eUBNXtIUrw",
  authDomain: "codeblooded-f07f6.firebaseapp.com",
  projectId: "codeblooded-f07f6",
  storageBucket: "codeblooded-f07f6.firebasestorage.app",
  messagingSenderId: "143682941397",
  appId: "1:143682941397:web:50d447c6a622827bcd0d5c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


export {
  auth,
  db,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  doc,
  setDoc,
  getDoc
};

export class MenuItem{
  name
  price
  description
  image
  category
  restrictions
  id

  constructor(id, name, price, description, image, category, restrictions) {
    this.id = id;
    this.name = name;
    this.price = price;
    this.description = description;
    this.image = image;
    this.category = category;
    this.restrictions = restrictions;
  }
}

export class Menu{
  itemList
  owner
  constructor(owner){
    this.itemList = [];
    this.owner = owner;
  }
  addItem(menuItem){
    this.itemList.push(menuItem);
  }
}

//export class MenuItem {};
//export class Menu {};
