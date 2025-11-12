import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

function CheckAuth({ children, protected: protectedRoute }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (protectedRoute) {
      if (!token) {
        navigate("/login");
      } else {
        setLoading(false);
      }
    } else {
      if (token) {
        navigate("/");
      } else {
        setLoading(false);
      }
    }
  }, [navigate, protectedRoute]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <div>{children}</div>;
}

export default CheckAuth;
