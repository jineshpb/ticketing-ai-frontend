import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
    const baseClasses = "px-3 py-1 rounded-full text-xs font-semibold";
    switch (status?.toLowerCase()) {
      case "open":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "in progress":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "resolved":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "closed":
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-600`;
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tickets</h1>
          {!loading && (
            <p className="mt-2 text-gray-600">
              {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}{" "}
              found
            </p>
          )}
        </div>

        {/* Create Ticket Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Create New Ticket
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                placeholder="Enter ticket title"
                value={formData.title}
                onChange={handleChange}
                disabled={submitting}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="Enter ticket description"
                value={formData.description}
                onChange={handleChange}
                disabled={submitting}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating..." : "Create Ticket"}
            </button>
          </form>
        </div>

        {/* Tickets List */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-red-500 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-red-700">{error}</p>
            </div>
            <button
              onClick={fetchTickets}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No tickets found
            </h3>
            <p className="mt-2 text-gray-500">
              Get started by creating a new ticket above.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    {tickets[0]?.assignedTo && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned To
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket._id}
                      onClick={() => handleTicketClick(ticket._id)}
                      tabIndex={0}
                      role="button"
                      aria-label={`View ticket ${ticket.title}`}
                      onKeyDown={(event) =>
                        handleTicketKeyDown(event, ticket._id)
                      }
                      aria-busy={triggeringTicketId === ticket._id}
                      className={`transition-colors ${
                        triggeringTicketId === ticket._id
                          ? "cursor-wait bg-gray-100"
                          : "cursor-pointer hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {ticket.title}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-md truncate">
                          {ticket.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadgeClass(ticket.status)}>
                          {ticket.status || "Open"}
                        </span>
                      </td>
                      {ticket.assignedTo && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {ticket.assignedTo.email || "Unassigned"}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(ticket.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tickets;
