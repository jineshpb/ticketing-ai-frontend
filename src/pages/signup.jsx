import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    skills: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);

    const skillsArray = formData.skills
      ? formData.skills
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/auth/signup`,
        {
          method: "POST",
          body: JSON.stringify({ ...formData, skills: skillsArray }),
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
        alert(data.message || "signup failed");
        console.error(data.error);
      }
    } catch (error) {
      alert(error.message || "signup failed");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 max-w-sm mx-auto mt-30">
      <div className="flex items-center gap-2 mb-8">
        <img src="/logo.svg" alt="logo" className="w-6 h-6" />
        <h1 className="text-2xl font-bold items-start">Ticketing AI</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
          <CardDescription>Create a new account to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                type="email"
                id="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                type="password"
                id="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="skills">Skills (comma-separated)</Label>
              <Input
                type="text"
                id="skills"
                name="skills"
                placeholder="e.g., JavaScript, React, Node.js"
                value={formData.skills}
                onChange={handleChange}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Signing up..." : "Sign Up"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default SignupPage;
