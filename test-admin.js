import axios from 'axios';
const baseURL = 'http://localhost:5000';

// Create a session-aware axios instance
const api = axios.create({
  baseURL,
  withCredentials: true
});

async function main() {
  try {
    console.log('Testing admin functionality...');
    
    // 1. Login as admin
    console.log('Logging in as admin...');
    const loginResponse = await api.post('/api/auth/login', {
      email: 'admin@example.com',
      password: 'password123'
    });
    
    console.log('Login successful!');
    console.log('User:', loginResponse.data.user);
    
    // 2. Try accessing admin endpoint
    console.log('\nTrying to access admin users endpoint...');
    const usersResponse = await api.get('/api/admin/users');
    
    console.log('Admin access successful!');
    console.log('Users:', usersResponse.data.users);
    
    console.log('\nAll tests passed! Admin functionality is working correctly.');
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

main();