import { useState } from "react";
import api from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({ name:"", rollNo:"", email:"", password:"" });
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      localStorage.setItem("token", data.access_token);
      toast.success("Registered successfully");
      nav("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const onChange = (e)=> setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#E8F5E9]">
      <div className="mx-auto max-w-md px-4 py-12">
        <Card className="shadow-lg border border-[#A5D6A7]" data-testid="register-card">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-[#2E7D32]">Create Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4" data-testid="register-form">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" data-testid="register-name-input" value={form.name} onChange={onChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rollNo">Roll Number</Label>
                <Input id="rollNo" name="rollNo" data-testid="register-roll-input" value={form.rollNo} onChange={onChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" data-testid="register-email-input" type="email" value={form.email} onChange={onChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" data-testid="register-password-input" type="password" value={form.password} onChange={onChange} required />
              </div>
              <Button data-testid="register-submit-button" disabled={loading} type="submit" className="w-full rounded-full bg-[#2E7D32] hover:bg-[#1B5E20]">{loading?"Creating...":"Create account"}</Button>
              <div className="text-sm text-gray-700">Have an account? <Link to="/login" data-testid="go-login" className="text-[#2E7D32] hover:underline">Login</Link></div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
