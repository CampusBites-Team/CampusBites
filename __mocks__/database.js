export const db = {};
export const auth = { currentUser: null };
export const storage = {};

export const addDoc = jest.fn();
export const getDocs = jest.fn();
export const getDoc = jest.fn().mockResolvedValue({ exists: () => true, data: () => ({}) });
export const updateDoc = jest.fn();
export const deleteDoc = jest.fn();
export const collection = jest.fn();
export const doc = jest.fn();
export const where = jest.fn();
export const query = jest.fn();
export const serverTimestamp = jest.fn();
export const ref = jest.fn();
export const uploadBytes = jest.fn();
export const getDownloadURL = jest.fn();
export const onSnapshot = jest.fn();

export const onAuthStateChanged = jest.fn((auth, callback) => {
  // Simulate a logged-in user by default
  callback({ uid: "test-uid-123" });
});