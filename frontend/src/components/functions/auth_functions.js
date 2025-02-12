import axios from 'axios';

// auth for undockerized project
//const clientId = 'ai21cVtLBNXSaGQ3QwklqOfxmdH3DOEB21iP2VwO';
//const clientSecret = 'cn5upUUXY7gGPEkIccB1AZEIhCUR4h0V9MGY9jD7630HVqyY2kyN7NjoVjkx0EMxDwUVqKNugTdeUa5nD8fsXbewAopFjG9BCFNt5KSyYSYj1wf9CVrAlFxQsQq9GF5S';

const clientId = "zAHVaU3Agr5IOFvaN47dEL9U1l6cc0ApsJDsLGp9";
const clientSecret = "UZXJzGbrxi2DRyEQx79mMc3o4m8nlZfREva02BJmwOEFWtquHF0FVukK8oAp4caJuLjYtyV03BcCHi95AFj1qqyAZe8diuakrurTp2cZLwcVW4UhehWjGp859VWuVVhO";
export const handleLogin = async (props) => {
    /*
    Args:
        - username
        - password
        - setIsAuthenticated
        - setError
    
    Output:
        - Sets tokens in local storage
    */
    try {
        const response = await axios.post('http://127.0.0.1:8000/auth/token/', {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'password',
            username: props.username,
            password: props.password,
            
        }
        );

        // Store tokens in local storage
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('refresh_token', response.data.refresh_token);
        props.setIsAuthenticated(true);
        props.navigate("/");

    } catch (error) {
      console.log('Error:', error); // Log the error for debugging
      let errorMessage = 'An error occurred.';
      if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          errorMessage = error.response.data.error_description || errorMessage; // Access detail if it exists
      } else if (error.request) {
          // The request was made but no response was received
          console.error('No response from server', error.request);
          errorMessage = 'No response from server'
      } else {
          // Something happened in setting up the request that triggered an Error
          console.error('Error', error.message);
          errorMessage = error.message;
            }
      props.setError(errorMessage);
      console.log(errorMessage);
      return errorMessage;
    } 
    
};

export const handleRefresh = async (props) => {
  
  try {
    const token = localStorage.getItem('refresh_token');
    const response = await axios.post('http://localhost:8000/auth/token', {
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token,
    });
    localStorage.setItem('access_token', response.data.access_token)
    return true;
  } catch(error) {
    return false;
  }
  
}

export const handleLogout = async (props) => {
    /*
    Args:
        - setIsAuthenticated
        - setError
    */
    try {
      
      const token = localStorage.getItem('access_token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
        accept: 'application/json',
      };
      await axios.post(
        'http://127.0.0.1:8000/auth/revoke-token/',
        {
          client_id: clientId,
          client_secret: clientSecret,
          token,
        },
        { headers }
      );
      localStorage.removeItem('access_token');
      props.setIsAuthenticated(false);
      return true;
    } catch (error) {
      props.setError(error)
      return false;
    }
  };



/*
Axios interceptor for an Unauthorized 401 response
*/
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
      const originalRequest = error.config;
      if (error.response.status === 401 && !originalRequest._retry) {
          localStorage.removeItem('access_token');
          /*
          originalRequest._retry = true;
          const access_token = await handleRefresh();
          if (access_token) {
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
              return axios(originalRequest);
          }
          */
      }
      // Return the error if token refresh fails or is not a 401 error.
      return Promise.reject(error);
  }
);