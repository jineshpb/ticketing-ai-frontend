import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';

function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    skills: [],
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true); 

    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/signup`, {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/');
      } else {
        alert(data.message || "sigup failed");
        console.error(data.error);
      }
    } catch (error) {
      alert(error.message || "sigup failed");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  
  return (
    <div>
      <h1>Signup</h1>
      <form onSubmit={handleSignup} className='flex flex-col gap-4'>
        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className='input input-bordered ' />
        <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} className='input input-bordered ' />
        <input type="skills" name="skills" placeholder="Skills" value={formData.skills} onChange={handleChange} className='input input-bordered ' />
        <button type="submit" disabled={loading} className='btn btn-primary w-auto'>Signup</button>
      </form>
    </div>
  );
};



export default SignupPage;