import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

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

  const fetchTicketDetails = useCallback(async () => {
    if (!ticketId) {
      setFetchError("Missing ticket identifier.");
      setTicket(null);
      setIsLoading(false);
      return;
    }

    if (!token) {
      setFetchError("Authentication token is missing. Please log in again.");
      setTicket(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
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
      setTicket(null);
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, token]);

  useEffect(() => {
    fetchTicketDetails();
  }, [fetchTicketDetails]);

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
    const baseClasses =
      "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide";
    switch (status?.toUpperCase?.()) {
      case "RESOLVED":
        return `${baseClasses} bg-emerald-100 text-emerald-800`;
      case "IN_PROGRESS":
        return `${baseClasses} bg-indigo-100 text-indigo-800`;
      case "TODO":
        return `${baseClasses} bg-slate-100 text-slate-700`;
      default:
        return `${baseClasses} bg-slate-200 text-slate-600`;
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
        <h1 className="text-2xl font-semibold text-slate-900">
          Loading ticket…
        </h1>
        <p className="text-base text-slate-600">
          Fetching the latest details for this ticket.
        </p>
      </main>
    );
  }

  if (fetchError) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 px-4 py-16">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-red-600">
            Unable to load ticket
          </h1>
          <p className="text-center text-base text-slate-600">{fetchError}</p>
          <button
            type="button"
            onClick={handleRetryClick}
            onKeyDown={handleRetryKeyDown}
            tabIndex={0}
            aria-label="Retry loading ticket details"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Retry
          </button>
        </div>
        <button
          type="button"
          onClick={handleBackClick}
          onKeyDown={handleBackKeyDown}
          tabIndex={0}
          aria-label="Go back to ticket list"
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Back to tickets
        </button>
      </main>
    );
  }

  if (!ticket) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold text-slate-900">
          Ticket not available
        </h1>
        <p className="text-base text-slate-600">
          Try refreshing the page or returning to the ticket list.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRetryClick}
            onKeyDown={handleRetryKeyDown}
            tabIndex={0}
            aria-label="Reload ticket details"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={handleBackClick}
            onKeyDown={handleBackKeyDown}
            tabIndex={0}
            aria-label="Return to ticket list"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Back to tickets
          </button>
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
    <main className="mx-auto min-h-screen w-full max-w-3xl bg-white px-4 py-16">
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Ticket
            </span>
            <h1 className="text-3xl font-semibold text-slate-900">
              {ticket.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className={statusBadgeClass}>{statusLabel}</span>
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Priority: {priorityLabel}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canReopenTicket ? (
              <button
                type="button"
                onClick={handleReopenClick}
                onKeyDown={handleReopenKeyDown}
                tabIndex={0}
                aria-label="Reopen ticket"
                disabled={isUpdatingStatus}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-amber-400"
              >
                {isUpdatingStatus ? "Reopening..." : "Reopen ticket"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleBackClick}
              onKeyDown={handleBackKeyDown}
              tabIndex={0}
              aria-label="Return to ticket list"
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Back to tickets
            </button>
          </div>
        </div>

        <section className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <article className="grid gap-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Description
            </h2>
            <p className="text-base text-slate-700">{ticket.description}</p>
          </article>

          <article className="grid gap-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Status
            </h2>
            <p className="text-base text-slate-700">{statusLabel}</p>
          </article>

          <article className="grid gap-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Assigned To
            </h2>
            <p className="text-base text-slate-700">{assignedToLabel}</p>
          </article>

          <article className="grid gap-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Created At
            </h2>
            <p className="text-base text-slate-700">{formattedCreatedAt}</p>
          </article>

          <article className="grid gap-2 text-base">
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Helpful Notes
            </h2>
            <div className="prose max-w-none leading-relaxed">
              <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>
                {helpfulNotes}
              </ReactMarkdown>
            </div>
          </article>

          {relatedSkills.length ? (
            <article className="grid gap-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
                Related Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {relatedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </article>
          ) : null}
        </section>

        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Discussion</h2>
            <span className="text-sm text-slate-500">
              {comments.length} {comments.length === 1 ? "comment" : "comments"}
            </span>
          </header>

          {comments.length === 0 ? (
            <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">
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
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {authorLabel}
                        </span>
                        {isAiComment ? (
                          <span className="rounded-full bg-indigo-600 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                            AI suggestion
                          </span>
                        ) : null}
                      </div>
                      <time className="text-xs text-slate-500">
                        {createdAtLabel}
                      </time>
                    </div>
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                      {comment?.body || "No content provided."}
                    </p>
                    {comment?.metadata?.followUpTasks?.length ? (
                      <div className="mt-3 grid gap-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Suggested Tasks
                        </p>
                        <ul className="grid gap-2">
                          {comment.metadata.followUpTasks.map(
                            (task, taskIndex) => (
                              <li
                                key={`${task?.title || "task"}-${taskIndex}`}
                                className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600"
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
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                              decision === "accepted"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {decision === "accepted"
                              ? "Suggestion accepted"
                              : "Suggestion rejected"}
                            {decisionAt ? ` · ${decisionAt}` : ""}
                          </span>
                        ) : canModerateSuggestions ? (
                          isLatestAiSuggestion ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleSuggestionDecision(
                                    rawCommentId,
                                    "accepted"
                                  )
                                }
                                disabled={decisionBusyId === rawCommentId}
                                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-400"
                              >
                                {decisionBusyId === rawCommentId
                                  ? "Saving…"
                                  : "Accept"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleSuggestionDecision(
                                    rawCommentId,
                                    "rejected"
                                  )
                                }
                                disabled={decisionBusyId === rawCommentId}
                                className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-rose-400"
                              >
                                {decisionBusyId === rawCommentId
                                  ? "Saving…"
                                  : "Reject"}
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-500">
                              Suggestion generated before review controls were
                              available.
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-slate-500">
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
              <label
                htmlFor="ticket-reply"
                className="text-sm font-medium text-slate-700"
              >
                Add a reply
              </label>
              <textarea
                id="ticket-reply"
                name="ticket-reply"
                value={commentBody}
                onChange={handleCommentChange}
                rows={4}
                placeholder="Share an update or ask a follow-up question…"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                aria-required="true"
                disabled={isSubmittingComment}
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingComment || !commentBody.trim().length}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {isSubmittingComment ? "Posting…" : "Post reply"}
                </button>
              </div>
            </form>
          ) : null}
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRetryClick}
            onKeyDown={handleRetryKeyDown}
            tabIndex={0}
            aria-label="Refresh ticket details"
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Refresh details
          </button>
        </div>
      </div>
    </main>
  );
};

export default TicketDetailsPage;
