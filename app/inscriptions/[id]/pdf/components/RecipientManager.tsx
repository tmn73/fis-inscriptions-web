"use client";

import React, {useState, useEffect, useMemo} from "react";
import {toast} from "@/components/ui/use-toast";
import {useQueryClient} from "@tanstack/react-query";
import {BrowserWarning, detectBrowser} from "./BrowserWarning";
import {useOrganization} from "@/hooks/useOrganization";
import {useTranslations} from "next-intl";

export type Recipient = {
  email: string;
  name: string;
  surname: string;
  reason: string;
  isResolvable: boolean;
};

// New type for processed recipients
type DisplayRecipient = {
  id: string; // Unique key for React, email will be used
  email: string;
  name: string;
  surname: string;
  reasons: string[];
  isResolvable: boolean;
};

// Update RecipientManagerProps to include new props and remove onSendPdf
type RecipientManagerProps = {
  initialRecipients: Recipient[];
  gender?: "M" | "W";
  inscriptionId: string;
  emailSentAt?: Date | null;
  eventData: any; // Competition type
};

// Email constants will be loaded dynamically from organization config

const getBadgeClassForReason = (reason: string): string => {
  const baseClasses =
    "px-2 py-0.5 text-xs font-medium rounded-full mr-1 mb-1 inline-block";
  if (reason.toLowerCase().includes("créateur")) {
    return `${baseClasses} bg-green-100 text-green-700`;
  }
  if (reason.toLowerCase().includes("modifié")) {
    return `${baseClasses} bg-yellow-100 text-yellow-700`;
  }
  if (reason.toLowerCase().includes("actuel")) {
    return `${baseClasses} bg-blue-100 text-blue-700`;
  }
  if (
    reason.toLowerCase().includes("inconnu") ||
    reason.toLowerCase().includes("non fourni")
  ) {
    return `${baseClasses} bg-gray-100 text-gray-700`;
  }
  if (reason.toLowerCase().includes("automatique")) {
    return `${baseClasses} bg-indigo-100 text-indigo-700`;
  }
  if (reason.toLowerCase().includes("femmes")) {
    return `${baseClasses} bg-pink-100 text-pink-700`;
  }
  if (reason.toLowerCase().includes("hommes")) {
    return `${baseClasses} bg-blue-100 text-blue-700`;
  }
  return `${baseClasses} bg-purple-100 text-purple-700`; // Default for other reasons
};

export const RecipientManager: React.FC<RecipientManagerProps> = ({
  initialRecipients,
  gender,
  inscriptionId,
  emailSentAt,
  eventData,
}) => {
  const t = useTranslations("inscriptionDetail.pdf.recipientManager");
  const queryClient = useQueryClient();
  const [selectedRecipients, setSelectedRecipients] = useState<
    Record<string, boolean>
  >({});
  const [customEmails, setCustomEmails] = useState<DisplayRecipient[]>([]);
  const [newEmail, setNewEmail] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("");

  // State for API call UI feedback
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Detect if user is on Chrome macOS
  const [isChromeOnMac, setIsChromeOnMac] = useState(false);
  useEffect(() => {
    const browserInfo = detectBrowser();
    setIsChromeOnMac(browserInfo.isChrome && browserInfo.isMac);
  }, []);

  // Generate default email subject
  useEffect(() => {
    const formatShortDate = (start: Date, end: Date) => {
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      const startD = new Date(start);
      const endD = new Date(end);
      const sameMonth = startD.getMonth() === endD.getMonth();
      const sameYear = startD.getFullYear() === endD.getFullYear();
      const yearStr = String(endD.getFullYear()).slice(-2);
      
      if (sameMonth && sameYear) {
        return `${startD.getDate()}-${endD.getDate()} ${months[endD.getMonth()]} ${yearStr}`;
      } else {
        // Fallback for different months using native JS
        const formatDate = (date: Date) => {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        };
        return `${formatDate(startD)}-${formatDate(endD)}`;
      }
    };

    if (eventData) {
      const shortDate = formatShortDate(
        new Date(eventData.startDate),
        new Date(eventData.endDate)
      );
      const place = eventData.place || "";
      const nation = eventData.placeNationCode ? `(${eventData.placeNationCode})` : "";
      const subjectGender = gender === "M" ? "MEN" : gender === "W" ? "WOMEN" : "TEAM";

      const raceType = eventData.categoryCodes
        ?.filter((code: string) => code !== "TRA")
        .join("/") || "FIS";

      const isNC = eventData.categoryCodes?.includes("NC") ?? false;
      const actionWord = isNC ? "quota request" : "entries";

      let subjectLine = `French 🇫🇷 ${subjectGender} ${actionWord} for ${shortDate} ➞ ${place} ${nation} - ${raceType}`
        .replace(/ +/g, " ")
        .replace(" ()", "")
        .trim();

      // Add [UPDATE] prefix if email was already sent
      if (emailSentAt) {
        subjectLine = `[UPDATE] ${subjectLine}`;
      }

      setEmailSubject(subjectLine);
    }
  }, [eventData, gender, emailSentAt]);

  const {data: organization} = useOrganization();

  const predefinedRecipients = useMemo(() => {
    if (!organization) return [];

    const processedEmails: DisplayRecipient[] = [];

    // Add all_races emails
    organization.emails.all_races.forEach(({email, name, reason}) => {
      processedEmails.push({
        id: `predefined-${email}`,
        email,
        name,
        surname: "",
        reasons: [reason],
        isResolvable: true,
      });
    });

    // Add gender-specific emails
    if (gender === "W") {
      organization.emails.women.forEach(({email, name, reason}) => {
        processedEmails.push({
          id: `predefined-${email}`,
          email,
          name,
          surname: "",
          reasons: [reason],
          isResolvable: true,
        });
      });
    } else if (gender === "M") {
      organization.emails.men.forEach(({email, name, reason}) => {
        processedEmails.push({
          id: `predefined-${email}`,
          email,
          name,
          surname: "",
          reasons: [reason],
          isResolvable: true,
        });
      });
    }

    return processedEmails;
  }, [organization, gender]);

  const displayRecipients = useMemo(() => {
    const processedMap = new Map<string, DisplayRecipient>();
    initialRecipients.forEach((rec) => {
      const existing = processedMap.get(rec.email);
      if (existing) {
        if (!existing.reasons.includes(rec.reason)) {
          existing.reasons.push(rec.reason);
        }
        if (rec.isResolvable && !existing.isResolvable) {
          existing.isResolvable = true;
          if (rec.name !== t("reasons.unknownUser")) {
            existing.name = rec.name;
            existing.surname = rec.surname;
          }
        }
      } else {
        processedMap.set(rec.email, {
          id: rec.email,
          email: rec.email,
          name: rec.name,
          surname: rec.surname,
          reasons: [rec.reason],
          isResolvable: rec.isResolvable,
        });
      }
    });
    predefinedRecipients.forEach((rec) => {
      if (!processedMap.has(rec.email)) {
        processedMap.set(rec.email, rec);
      } else {
        const existing = processedMap.get(rec.email)!;
        if (!existing.reasons.includes(rec.reasons[0])) {
          existing.reasons.push(rec.reasons[0]);
        }
      }
    });
    return Array.from(processedMap.values());
  }, [initialRecipients, predefinedRecipients]);

  const allRecipients = useMemo(() => {
    return [...displayRecipients, ...customEmails];
  }, [displayRecipients, customEmails]);

  useEffect(() => {
    setSelectedRecipients((prev) => {
      const updated: Record<string, boolean> = {...prev};
      allRecipients.forEach((recipient) => {
        if (!(recipient.email in updated)) {
          updated[recipient.email] = recipient.isResolvable;
        }
      });
      // Optionnel : supprimer les emails qui n'existent plus dans allRecipients
      Object.keys(updated).forEach((email) => {
        if (!allRecipients.some((r) => r.email === email)) {
          delete updated[email];
        }
      });
      return updated;
    });
  }, [allRecipients]);

  const handleCheckboxChange = (email: string, isResolvable: boolean) => {
    if (!isResolvable) return;
    setSelectedRecipients((prev) => ({
      ...prev,
      [email]: !prev[email],
    }));
  };

  const validateEmail = (email: string): boolean => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  };

  const addCustomEmail = () => {
    if (!newEmail.trim()) {
      setEmailError(t("errors.enterEmail"));
      return;
    }
    if (!validateEmail(newEmail)) {
      setEmailError(t("errors.validEmail"));
      return;
    }
    if (allRecipients.some((recipient) => recipient.email === newEmail)) {
      setEmailError(t("errors.emailExists"));
      return;
    }
    const customRecipient: DisplayRecipient = {
      id: `custom-${newEmail}`,
      email: newEmail,
      name: t("reasons.customEmail"),
      surname: "",
      reasons: [t("reasons.manuallyAdded")],
      isResolvable: true,
    };
    setCustomEmails((prev) => [...prev, customRecipient]);
    setNewEmail("");
    setEmailError("");
  };

  const removeCustomEmail = (email: string) => {
    setCustomEmails((prev) => prev.filter((rec) => rec.email !== email));
    setSelectedRecipients((prev) => {
      const newState = {...prev};
      delete newState[email];
      return newState;
    });
  };

  const handleSendPdf = async () => {
    const element = document.getElementById("pdf-content");
    if (!element) return;

    const toastInstance = toast({
      title: t("toasts.sending"),
      description: t("toasts.sendingDescription"),
      open: true,
      duration: 1000000, // très long
    });
    const toastId = toastInstance.id;

    // Import dynamique pour éviter les erreurs de type
    const html2canvas = (await import("html2canvas-pro")).default;
    const jsPDF = (await import("jspdf")).default;

    // Génère le canvas avec html2canvas-pro (qualité élevée, poids réduit)
    const canvas = await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: "#fff",
    });
    // Convertit le canvas en image JPEG (poids réduit)
    const imgData = canvas.toDataURL("image/jpeg", 0.98);

    // Crée le PDF avec jsPDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "cm",
      format: "a4",
    });
    // Dimensions du canvas/image
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    // Marge horizontale de 1cm
    const margin = 1;
    const availableWidth = pageWidth - 2 * margin;
    const availableHeight = pageHeight - 2 * margin;
    const ratio = Math.min(
      availableWidth / imgWidth,
      availableHeight / imgHeight
    );
    const displayWidth = imgWidth * ratio;
    const displayHeight = imgHeight * ratio;
    const x = (pageWidth - displayWidth) / 2;
    const y = (pageHeight - displayHeight) / 2;
    pdf.addImage(imgData, "JPEG", x, y, displayWidth, displayHeight);

    // Blob du PDF
    const pdfBlob = pdf.output("blob");

    setIsSending(true);
    setSendStatus(null);

    try {
      const formData = new FormData();
      const selectedEmails = Object.entries(selectedRecipients)
        .filter(([, isSelected]) => isSelected)
        .map(([email]) => email);
      if (selectedEmails.length === 0) {
        setSendStatus({
          message: t("errors.selectRecipient"),
          type: "error",
        });
        setIsSending(false);
        return;
      }
      formData.append("pdf", pdfBlob, "inscription.pdf");
      formData.append("to", JSON.stringify(selectedEmails));
      formData.append("inscriptionId", inscriptionId);
      formData.append("subject", emailSubject);
      if (gender) formData.append("gender", gender);

      const response = await fetch("/api/send-inscription-pdf", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.details || result.error || t("errors.sendError")
        );
      }
      setSendStatus({
        message: t("toasts.success", { emailId: result.emailId || "N/A" }),
        type: "success",
      });

      // Invalide les caches React Query pour mettre à jour l'interface
      await queryClient.invalidateQueries({
        queryKey: ["inscriptions"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["inscription-competitors-all", Number(inscriptionId)],
      });

      // Met à jour le toast en succès
      if (toastInstance && toastInstance.update) {
        toastInstance.update({
          id: toastId,
          title: t("toasts.sent"),
          description: t("toasts.sentDescription"),
          open: true,
          duration: 1000000,
          variant: "default",
        });
      }
    } catch (error: unknown) {
      setSendStatus({
        message:
          error instanceof Error
            ? error.message
            : t("errors.unknownError"),
        type: "error",
      });
      // Met à jour le toast en erreur
      if (toastInstance && toastInstance.update) {
        toastInstance.update({
          id: toastId,
          title: t("toasts.error"),
          description:
            error instanceof Error
              ? error.message
              : t("errors.unknownError"),
          open: true,
          duration: 1000000,
          variant: "destructive",
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  if (isChromeOnMac) {
    return <BrowserWarning />;
  }

  return (
    <div className="mt-6 p-4 border-t border-gray-200 print:hidden">
      <h3 className="text-lg font-semibold mb-3">
        {t("title")}
      </h3>

      {/* Display API Call Status */}
      {sendStatus && (
        <div
          className={`p-3 mb-3 rounded-md text-sm ${
            sendStatus.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {sendStatus.message}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendPdf();
        }}
      >
        {/* Email Subject Field */}
        <div className="mb-4">
          <label
            htmlFor="emailSubject"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t("emailSubject")}
          </label>
          <input
            type="text"
            id="emailSubject"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            disabled={isSending}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            placeholder={t("emailSubjectPlaceholder")}
            required
          />
          {emailSentAt && (
            <p className="mt-1 text-xs text-amber-600">
              {t("emailAlreadySent", {
                date: (() => {
                  const date = new Date(emailSentAt);
                  const day = String(date.getDate()).padStart(2, '0');
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const year = date.getFullYear();
                  const hours = String(date.getHours()).padStart(2, '0');
                  const minutes = String(date.getMinutes()).padStart(2, '0');
                  return `${day}/${month}/${year} à ${hours}:${minutes}`;
                })()
              })}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {allRecipients.map((recipient) => (
            <div
              key={recipient.id}
              className={`p-3 border rounded-lg flex items-start space-x-3 ${
                recipient.isResolvable
                  ? "border-gray-300"
                  : "border-red-300 bg-red-50"
              }`}
            >
              <input
                type="checkbox"
                id={`recipient-${recipient.email}`}
                checked={selectedRecipients[recipient.email] || false}
                onChange={() =>
                  handleCheckboxChange(recipient.email, recipient.isResolvable)
                }
                disabled={!recipient.isResolvable || isSending}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
              />
              <div className="flex-1">
                <label
                  htmlFor={`recipient-${recipient.email}`}
                  className={`font-medium ${
                    recipient.isResolvable ? "text-gray-800" : "text-red-600"
                  }`}
                >
                  {recipient.name} {recipient.surname}
                  {!recipient.isResolvable && ` ${t("invalidEmail")}`}
                </label>
                <p className="text-xs text-gray-500">{recipient.email}</p>
                <div>
                  {recipient.reasons.map((reason) => (
                    <span
                      key={reason}
                      className={getBadgeClassForReason(reason)}
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
              {recipient.id.startsWith("custom-") && (
                <button
                  type="button"
                  onClick={() => removeCustomEmail(recipient.email)}
                  disabled={isSending}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 cursor-pointer"
                >
                  {t("remove")}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <label
            htmlFor="customEmail"
            className="block text-sm font-medium text-gray-700"
          >
            {t("addCustomEmail")}
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="email"
              id="customEmail"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              placeholder={t("emailPlaceholder")}
              disabled={isSending}
              className="flex-1 block w-full min-w-0 rounded-none rounded-l-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50 px-3"
            />
            <button
              type="button"
              onClick={addCustomEmail}
              disabled={isSending}
              className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-700 rounded-r-md hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 cursor-pointer"
            >
              {t("add")}
            </button>
          </div>
          {emailError && (
            <p className="mt-1 text-xs text-red-600">{emailError}</p>
          )}
        </div>

        <div className="mt-6 text-right">
          <button
            type="submit"
            disabled={isSending || allRecipients.length === 0 || isChromeOnMac}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:opacity-70 cursor-pointer"
          >
            {isChromeOnMac
              ? t("chromeDisabled")
              : isSending
                ? t("sending")
                : t("sendButton")}
          </button>
        </div>
      </form>
    </div>
  );
};
