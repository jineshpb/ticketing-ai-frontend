import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
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
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/auth/signup`,
        {
          method: "POST",
          body: JSON.stringify(formData),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/");
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
  }

  return (
    <div className="flex flex-col   gap-2 max-w-sm mx-auto mt-30">
      <div className="flex items-center gap-2">
        <img src="/logo.svg" alt="logo" className="w-6 h-6" />
        <h1 className="text-2xl font-bold items-start">Ticketing AI</h1>
      </div>
      <h1 className="text-lg font-normal items-start mt-8">Login</h1>
      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="input input-bordered w-full"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="input input-bordered w-full"
        />
        <input
          type="skills"
          name="skills"
          placeholder="Skills"
          value={formData.skills}
          onChange={handleChange}
          className="input input-bordered w-full"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-auto"
        >
          Signup
        </button>
      </form>
    </div>
  );
}

export default SignupPage;
