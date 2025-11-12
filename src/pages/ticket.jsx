import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const TicketDetailsPage = () => {
  const { id: ticketId } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [decisionBusyId, setDecisionBusyId] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const token = useMemo(() => localStorage.getItem("token"), []);
  const currentUser = useMemo(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser);
    } catch (error) {
      console.error("Failed to parse stored user", error);
      return null;
    }
  }, []);
  const comments = useMemo(() => {
    if (!ticket?.comments?.length) {
      return [];
    }

    return [...ticket.comments].sort((first, second) => {
      const firstTimestamp = new Date(first?.createdAt || 0).getTime();
      const secondTimestamp = new Date(second?.createdAt || 0).getTime();
      return firstTimestamp - secondTimestamp;
    });
  }, [ticket?.comments]);

  const latestAiCommentId = useMemo(() => {
    if (!comments.length) {
      return null;
    }

    for (let index = comments.length - 1; index >= 0; index -= 1) {
      const comment = comments[index];
      if (comment?.isAiGenerated) {
        if (typeof comment?.commentId === "string") {
          return comment.commentId;
        }
        if (comment?.commentId?.toString) {
          return comment.commentId.toString();
        }
        if (comment?._id?.toString) {
          return comment._id.toString();
        }
      }
    }

    return null;
  }, [comments]);
  const pollIntervalRef = useRef(null);

  const fetchTicketDetails = useCallback(
    async ({ silent = false } = {}) => {
      if (!ticketId) {
        setFetchError("Missing ticket identifier.");
        setTicket(null);
        if (!silent) {
          setIsLoading(false);
        }
        return;
      }

      if (!token) {
        setFetchError("Authentication token is missing. Please log in again.");
        setTicket(null);
        if (!silent) {
          setIsLoading(false);
        }
        return;
      }

      try {
        if (!silent) {
          setIsLoading(true);
        }
        const response = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/ticket/${ticketId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          const errorMessage =
            errorPayload?.error || "Failed to load ticket details.";
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setTicket(data);
        setFetchError("");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load ticket details.";
        setFetchError(message);
        if (!silent) {
          setTicket(null);
        }
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [ticketId, token]
  );

  useEffect(() => {
    fetchTicketDetails();
  }, [fetchTicketDetails]);

  useEffect(() => {
    const shouldPoll =
      ticket && (!ticket.aiSuggestions || ticket.status !== "RESOLVED");

    if (shouldPoll) {
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          fetchTicketDetails({ silent: true });
        }, 4000);
      }
    } else if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [fetchTicketDetails, ticket]);

  const handleBackClick = () => {
    navigate("/");
  };

  const handleBackKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleBackClick();
    }
  };

  const handleRetryClick = () => {
    fetchTicketDetails();
  };

  const handleRetryKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleRetryClick();
    }
  };

  const handleReopenClick = async () => {
    if (!ticketId || !token || !ticket) {
      return;
    }

    const ticketOwnerId =
      typeof ticket.createdBy === "string"
        ? ticket.createdBy
        : ticket?.createdBy?._id;

    const isAllowed =
      currentUser &&
      (currentUser.role === "admin" ||
        (ticketOwnerId && ticketOwnerId === currentUser._id));

    if (!isAllowed) {
      alert("You are not authorized to reopen this ticket.");
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/ticket/${ticketId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "IN_PROGRESS" }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to reopen ticket.");
      }

      setTicket(data);
      setFetchError("");
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to reopen ticket."
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleReopenKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleReopenClick();
    }
  };

  const handleCommentChange = (event) => {
    setCommentBody(event.target.value);
  };

  const handleCommentSubmit = async (event) => {
    event.preventDefault();

    if (!commentBody.trim() || !token || !ticketId || !ticket) {
      return;
    }

    const ticketOwnerId =
      typeof ticket.createdBy === "string"
        ? ticket.createdBy
        : ticket?.createdBy?._id;

    const canPost =
      currentUser &&
      (currentUser.role === "admin" ||
        currentUser.role === "moderator" ||
        (ticketOwnerId && ticketOwnerId === currentUser._id));

    if (!canPost) {
      alert("You are not authorized to reply on this ticket.");
      return;
    }

    setIsSubmittingComment(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/ticket/${ticketId}/comments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ body: commentBody.trim() }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to post comment.");
      }

      setTicket(data);
      setCommentBody("");
      setFetchError("");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to add comment to the ticket."
      );
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleSuggestionDecision = async (commentId, decision) => {
    if (!commentId || !token || !ticketId) {
      console.log("commentId", commentId);
      console.log("token", token);
      console.log("ticketId", ticketId);

      return;
    }

    setDecisionBusyId(commentId);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_SERVER_URL
        }/ticket/${ticketId}/comments/${commentId}/decision`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ decision }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to update suggestion decision.");
      }

      setTicket(data);
      setFetchError("");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update suggestion decision."
      );
    } finally {
      setDecisionBusyId("");
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase?.()) {
      case "RESOLVED":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "IN_PROGRESS":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "TODO":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-200 text-slate-600 border-slate-300";
    }
  };

  const formatDateTime = (value) => {
    if (!value) {
      return "Not available";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "Not available";
    }

    return parsed.toLocaleString();
  };

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">
          Loading ticket…
        </h1>
        <p className="text-base text-muted-foreground">
          Fetching the latest details for this ticket.
        </p>
      </main>
    );
  }

  if (fetchError) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">
              Unable to load ticket
            </CardTitle>
            <CardDescription>{fetchError}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button
              onClick={handleRetryClick}
              onKeyDown={handleRetryKeyDown}
              tabIndex={0}
              aria-label="Retry loading ticket details"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            <Button
              onClick={handleBackClick}
              onKeyDown={handleBackKeyDown}
              tabIndex={0}
              aria-label="Go back to ticket list"
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to tickets
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!ticket) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold text-foreground">
          Ticket not available
        </h1>
        <p className="text-base text-muted-foreground">
          Try refreshing the page or returning to the ticket list.
        </p>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRetryClick}
            onKeyDown={handleRetryKeyDown}
            tabIndex={0}
            aria-label="Reload ticket details"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={handleBackClick}
            onKeyDown={handleBackKeyDown}
            tabIndex={0}
            aria-label="Return to ticket list"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to tickets
          </Button>
        </div>
      </main>
    );
  }

  const formattedCreatedAt = formatDateTime(ticket.createdAt);
  const assignedToLabel = ticket.assignedTo?.email || "Unassigned";
  const statusLabel = ticket.status || "Unknown";
  const helpfulNotes = ticket.helpfulNotes || "No helpful notes";
  const priorityLabel = ticket.priority || "Not set";
  const relatedSkills = Array.isArray(ticket.relatedSkills)
    ? ticket.relatedSkills
    : [];
  const ticketOwnerId =
    typeof ticket.createdBy === "string"
      ? ticket.createdBy
      : ticket?.createdBy?._id;
  const canManageStatus =
    currentUser &&
    (currentUser.role === "admin" ||
      (ticketOwnerId && ticketOwnerId === currentUser._id));
  const canReopenTicket = ticket.status === "RESOLVED" && canManageStatus;
  const canModerateSuggestions =
    currentUser &&
    (currentUser.role === "admin" || currentUser.role === "moderator");
  const canPostComment =
    currentUser &&
    (currentUser.role === "admin" ||
      currentUser.role === "moderator" ||
      (ticketOwnerId && ticketOwnerId === currentUser._id));
  const statusBadgeClass = getStatusBadgeClass(ticket.status);

  return (
    <main className="mx-auto min-h-screen w-full bg-background px-4 py-16">
      <div className="flex flex-col gap-8 max-w-3xl mx-auto">
        <div className="flex flex-col-reverse items-start justify-between gap-4">
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Ticket
            </span>
            <h1 className="text-3xl font-semibold text-foreground">
              {ticket.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={statusBadgeClass}>{statusLabel}</Badge>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Priority: {priorityLabel}
              </span>
            </div>
          </div>
          <div className="flex flex-row-reverse items-center gap-3">
            {canReopenTicket ? (
              <Button
                onClick={handleReopenClick}
                onKeyDown={handleReopenKeyDown}
                tabIndex={0}
                aria-label="Reopen ticket"
                disabled={isUpdatingStatus}
                variant="outline"
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                {isUpdatingStatus ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reopening...
                  </>
                ) : (
                  "Reopen ticket"
                )}
              </Button>
            ) : null}
            <Button
              onClick={handleBackClick}
              onKeyDown={handleBackKeyDown}
              tabIndex={0}
              aria-label="Return to ticket list"
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to tickets
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Description
              </h2>
              <p className="text-base text-foreground">{ticket.description}</p>
            </div>

            <Separator />

            <div className="grid gap-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </h2>
              <p className="text-base text-foreground">{statusLabel}</p>
            </div>

            <Separator />

            <div className="grid gap-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Assigned To
              </h2>
              <p className="text-base text-foreground">{assignedToLabel}</p>
            </div>

            <Separator />

            <div className="grid gap-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Created At
              </h2>
              <p className="text-base text-foreground">{formattedCreatedAt}</p>
            </div>

            <Separator />

            <div className="grid gap-2 text-base">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Helpful Notes
              </h2>
              <div className="prose max-w-none leading-relaxed">
                <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>
                  {helpfulNotes}
                </ReactMarkdown>
              </div>
            </div>

            {relatedSkills.length ? (
              <>
                <Separator />
                <div className="grid gap-2">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Related Skills
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {relatedSkills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Discussion</CardTitle>
              <span className="text-sm text-muted-foreground">
                {comments.length}{" "}
                {comments.length === 1 ? "comment" : "comments"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {comments.length === 0 ? (
              <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
                No comments yet. Moderator updates will show here.
              </p>
            ) : (
              <ul className="grid gap-4">
                {comments.map((comment, index) => {
                  const isAiComment = Boolean(comment?.isAiGenerated);
                  const createdAtLabel = formatDateTime(comment?.createdAt);
                  const rawCommentId =
                    typeof comment?.commentId === "string"
                      ? comment.commentId
                      : comment?.commentId?.toString?.();
                  const commentIdentifier =
                    rawCommentId ||
                    comment?._id?.toString?.() ||
                    comment?._id ||
                    `${index}`;
                  const hasCommentId = Boolean(rawCommentId);
                  const isLatestAiSuggestion =
                    Boolean(latestAiCommentId) &&
                    rawCommentId === latestAiCommentId &&
                    isAiComment &&
                    hasCommentId;
                  const authorLabel =
                    comment?.role ||
                    comment?.author?.email ||
                    `Participant ${index + 1}`;
                  const decision = comment?.metadata?.decision;
                  const decisionAt = comment?.metadata?.decisionAt
                    ? formatDateTime(comment.metadata.decisionAt)
                    : null;

                  return (
                    <li
                      key={`${commentIdentifier}-${createdAtLabel}`}
                      className={`rounded-lg border p-4 ${
                        isAiComment
                          ? "border-indigo-200 bg-indigo-50"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {authorLabel}
                          </span>
                          {isAiComment ? (
                            <Badge className="bg-indigo-600 text-white">
                              AI suggestion
                            </Badge>
                          ) : null}
                        </div>
                        <time className="text-xs text-muted-foreground">
                          {createdAtLabel}
                        </time>
                      </div>
                      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">
                        {comment?.body || "No content provided."}
                      </p>
                      {comment?.metadata?.followUpTasks?.length ? (
                        <div className="mt-3 grid gap-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Suggested Tasks
                          </p>
                          <ul className="grid gap-2">
                            {comment.metadata.followUpTasks.map(
                              (task, taskIndex) => (
                                <li
                                  key={`${task?.title || "task"}-${taskIndex}`}
                                  className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground"
                                >
                                  {task?.title}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      ) : null}
                      {isAiComment ? (
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          {decision ? (
                            <Badge
                              className={
                                decision === "accepted"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                  : "bg-rose-100 text-rose-700 border-rose-200"
                              }
                            >
                              {decision === "accepted"
                                ? "Suggestion accepted"
                                : "Suggestion rejected"}
                              {decisionAt ? ` · ${decisionAt}` : ""}
                            </Badge>
                          ) : canModerateSuggestions ? (
                            isLatestAiSuggestion ? (
                              <>
                                <Button
                                  onClick={() =>
                                    handleSuggestionDecision(
                                      rawCommentId,
                                      "accepted"
                                    )
                                  }
                                  disabled={decisionBusyId === rawCommentId}
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                  {decisionBusyId === rawCommentId ? (
                                    <>
                                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                      Saving…
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="mr-2 h-3 w-3" />
                                      Accept
                                    </>
                                  )}
                                </Button>
                                <Button
                                  onClick={() =>
                                    handleSuggestionDecision(
                                      rawCommentId,
                                      "rejected"
                                    )
                                  }
                                  disabled={decisionBusyId === rawCommentId}
                                  size="sm"
                                  variant="destructive"
                                >
                                  {decisionBusyId === rawCommentId ? (
                                    <>
                                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                      Saving…
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="mr-2 h-3 w-3" />
                                      Reject
                                    </>
                                  )}
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Suggestion generated before review controls were
                                available.
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Awaiting moderator review.
                            </span>
                          )}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            {canPostComment ? (
              <form className="grid gap-3" onSubmit={handleCommentSubmit}>
                <Label htmlFor="ticket-reply">Add a reply</Label>
                <Textarea
                  id="ticket-reply"
                  name="ticket-reply"
                  value={commentBody}
                  onChange={handleCommentChange}
                  rows={4}
                  placeholder="Share an update or ask a follow-up question…"
                  aria-required="true"
                  disabled={isSubmittingComment}
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmittingComment || !commentBody.trim().length}
                  >
                    {isSubmittingComment ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Posting…
                      </>
                    ) : (
                      "Post reply"
                    )}
                  </Button>
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleRetryClick}
            onKeyDown={handleRetryKeyDown}
            tabIndex={0}
            aria-label="Refresh ticket details"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh details
          </Button>
        </div>
      </div>
    </main>
  );
};

export default TicketDetailsPage;
