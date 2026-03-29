/**
 * Contact Form API Handler
 * Cloudflare Pages Function
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // Parse the request body
    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();
    const email = formData.get('email')?.toString().trim();
    const message = formData.get('message')?.toString().trim();
    
    // Validation
    if (!name || !email || !message) {
      return new Response(JSON.stringify({
        success: false,
        error: 'All fields are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid email format'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Log the contact submission
    console.log('Contact Form Submission:', { name, email, message, timestamp: new Date().toISOString() });
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Thank you! Your message has been received.',
      data: {
        name,
        email,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('Contact API Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'An error occurred. Please try again.'
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
