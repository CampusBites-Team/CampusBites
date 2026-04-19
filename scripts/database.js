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
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-storage.js";

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
const storage = getStorage(app);


export {
  auth,
  db,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  doc,
  setDoc,
  getDoc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onAuthStateChanged,
  collection,
  query,
  where,
  serverTimestamp,
  signOut,
  sendPasswordResetEmail
};

/*export class MenuItem{
  name
  price
  description
  image
  category
  restrictions
  id
  menu

  constructor(id, name, price, description, image, category, restrictions, menu) {
    this.id = id;
    this.name = name;
    this.price = price;
    this.description = description;
    this.image = image;
    this.category = category;
    this.restrictions = restrictions;
    this.menu = menu;
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
}*/

//export class MenuItem {};
//export class Menu {};

