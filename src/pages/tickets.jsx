import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ title: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [triggeringTicketId, setTriggeringTicketId] = useState(null);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/ticket`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch tickets");
      }

      const data = await res.json();
      setTickets(data || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      setError(error.message || "Failed to load tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const notifyTicketOpened = async (ticketId) => {
    if (!ticketId || !token) {
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/ticket/${ticketId}/open`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const errorMessage = payload?.error || "Failed to notify ticket opened";
        throw new Error(errorMessage);
      }
    } catch (notifyError) {
      console.error("Error notifying ticket opened:", notifyError);
    }
  };

  const handleTicketClick = async (ticketId) => {
    if (!ticketId) {
      return;
    }

    const targetTicket = tickets.find((entry) => entry._id === ticketId);
    const shouldTriggerAssistance =
      targetTicket?.status?.toUpperCase?.() !== "RESOLVED";

    if (shouldTriggerAssistance) {
      setTriggeringTicketId(ticketId);
      try {
        await notifyTicketOpened(ticketId);
      } finally {
        setTriggeringTicketId(null);
      }
    }

    navigate(`/tickets/${ticketId}`);
  };

  const handleTicketKeyDown = async (event, ticketId) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    await handleTicketClick(ticketId);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "in progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200";
      case "closed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      alert("Please fill in both title and description");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/ticket`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create ticket");
      }

      setFormData({ title: "", description: "" });
      await fetchTickets();
      alert("Ticket created successfully!");
    } catch (error) {
      console.error("Error creating ticket:", error);
      alert(error.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Create Ticket Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Ticket</CardTitle>
            <CardDescription>
              Make sure to enter a valid title and description
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="space-y-4 w-full flex flex-col gap-4"
            >
              <div className="w-full">
                <Label htmlFor="title">Title</Label>
                <Input
                  type="text"
                  id="title"
                  name="title"
                  placeholder="Enter ticket title"
                  value={formData.title}
                  onChange={handleChange}
                  disabled={submitting}
                  className="mt-1"
                />
              </div>
              <div className="w-full">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Enter ticket description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={submitting}
                  rows={4}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Ticket"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Tickets List */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-foreground">Tickets</h1>
          {!loading && (
            <p className="mt-2 text-muted-foreground">
              {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}{" "}
              found
            </p>
          )}
        </div>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                onClick={fetchTickets}
                variant="outline"
                size="sm"
                className="ml-4"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <p className="mt-4 text-muted-foreground">Loading tickets...</p>
            </CardContent>
          </Card>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Inbox className="mx-auto h-16 w-16 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium text-foreground">
                No tickets found
              </h3>
              <p className="mt-2 text-muted-foreground">
                Get started by creating a new ticket above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    {tickets[0]?.assignedTo && (
                      <TableHead>Assigned To</TableHead>
                    )}
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow
                      key={ticket._id}
                      onClick={() => handleTicketClick(ticket._id)}
                      tabIndex={0}
                      role="button"
                      aria-label={`View ticket ${ticket.title}`}
                      onKeyDown={(event) =>
                        handleTicketKeyDown(event, ticket._id)
                      }
                      aria-busy={triggeringTicketId === ticket._id}
                      className={`cursor-pointer transition-colors ${
                        triggeringTicketId === ticket._id
                          ? "cursor-wait bg-muted"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <TableCell className="font-medium">
                        {ticket.title}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-md truncate">
                          {ticket.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeClass(ticket.status)}>
                          {ticket.status || "Open"}
                        </Badge>
                      </TableCell>
                      {ticket.assignedTo && (
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {ticket.assignedTo.email || "Unassigned"}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(ticket.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Tickets;
