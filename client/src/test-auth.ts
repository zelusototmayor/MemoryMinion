// Test authentication function for debugging purposes only

export async function testLoginRequest(email: string, password: string) {
  try {
    console.log("Testing login with", email);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });
    
    console.log("API Response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Login API error:", errorText);
      return { success: false, error: errorText };
    }
    
    const data = await response.json();
    console.log("Login API response data:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Login request error:", error);
    return { success: false, error };
  }
}

export async function testUserRequest() {
  try {
    console.log("Testing user API");
    const response = await fetch("/api/auth/user");
    
    console.log("API Response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("User API error:", errorText);
      return { success: false, error: errorText };
    }
    
    const data = await response.json();
    console.log("User API response data:", data);
    return { success: true, data };
  } catch (error) {
    console.error("User request error:", error);
    return { success: false, error };
  }
}

export async function testLogoutRequest() {
  try {
    console.log("Testing logout API");
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });
    
    console.log("API Response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Logout API error:", errorText);
      return { success: false, error: errorText };
    }
    
    const data = await response.json();
    console.log("Logout API response data:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Logout request error:", error);
    return { success: false, error };
  }
}