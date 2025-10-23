import { useState } from "react";
import api from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", data.access_token);
      toast.success("Logged in successfully");
      nav("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#E8F5E9]">
      <div className="mx-auto max-w-md px-4 py-12">
        <Card className="shadow-lg border border-[#A5D6A7]" data-testid="login-card">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-[#2E7D32]">Student Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4" data-testid="login-form">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" data-testid="login-email-input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@hitam.ac.in" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" data-testid="login-password-input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Checkbox id="remember" data-testid="remember-me" />
                  <label htmlFor="remember" className="text-gray-600">Remember me</label>
                </div>
                <button type="button" className="text-[#2E7D32] hover:underline" data-testid="forgot-password">Forgot password?</button>
              </div>
              <Button data-testid="login-submit-button" disabled={loading} type="submit" className="w-full rounded-full bg-[#2E7D32] hover:bg-[#1B5E20]">{loading?"Signing in...":"Sign in"}</Button>
              <div className="text-sm text-gray-700">No account? <Link to="/register" data-testid="go-register" className="text-[#2E7D32] hover:underline">Register</Link></div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
