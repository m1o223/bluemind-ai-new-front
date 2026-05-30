import {
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
} from "../services/reminderService"
import { setupReminderNotifications } from "../services/notificationService"

import { useCallback, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  Search,
  MoreVertical,
  X,
  ArrowLeft,
  Clock,
  Calendar,
} from "lucide-react"

import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useApp } from "@/context/AppContext"
import BrandLogo from "@/components/BrandLogo"
import { toast } from "sonner"

function formatDate(dateStr, language = "en") {
  const date = new Date(dateStr + "T00:00:00")

  return date.toLocaleDateString(language || "en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function formatTime(timeObj, language = "en") {
  if (!timeObj) return ""
  if (typeof timeObj === "string") return timeObj

  const hour = timeObj.hour
  const minute = timeObj.minute
  const date = new Date(2000, 0, 1, hour, minute)

  return date.toLocaleTimeString(language || "en", {
    hour: "numeric",
    minute: "2-digit",
  })
}

function ReminderCard({ reminder, onEdit, onDelete, t, language, isDark, appColor }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        "rounded-xl border p-5 hover:shadow-sm transition-all duration-200 relative",
        isDark ? "bg-[#252525] border-[#333] hover:border-[#466589]" : "bg-white border-[#E5E7EB] hover:border-[#193B68]/50",
      )}
      data-testid={`reminder-card-${reminder._id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className={cn("font-medium text-base truncate", isDark ? "text-white" : "text-[#111827]")}>
            {reminder.title}
          </h3>

          <p className={cn("text-sm mt-1 line-clamp-2", isDark ? "text-[#aaa]" : "text-[#6B7280]")}>
            {reminder.description}
          </p>

          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-xs" style={{ color: appColor }}>
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(reminder.reminderDate || reminder.date, language)}
            </span>

            <span className="flex items-center gap-1.5 text-xs" style={{ color: appColor }}>
              <Clock className="w-3.5 h-3.5" />
              {formatTime(reminder.reminderTime || reminder.time, language)}
            </span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={cn(
              "p-1.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
              isDark ? "text-[#aaa] hover:text-white hover:bg-[#333]" : "text-[#193B68] hover:text-[#111827] hover:bg-[#F3F4F6]",
            )}
            data-testid={`reminder-menu-${reminder._id}`}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />

              <div
                className={cn(
                  "absolute right-0 top-9 rounded-lg border shadow-lg z-20 py-1 w-28",
                  isDark ? "bg-[#222] border-[#333]" : "bg-white border-[#E5E7EB]",
                )}
                data-testid={`reminder-dropdown-${reminder._id}`}
              >
                <button
                  onClick={() => {
                    onEdit(reminder)
                    setMenuOpen(false)
                  }}
                  className={cn("w-full px-3 py-2 text-sm text-left transition-colors cursor-pointer", isDark ? "text-[#ddd] hover:bg-[#2a2a2a]" : "text-[#374151] hover:bg-[#F9FAFB]")}
                >
                  {t("edit")}
                </button>

                <button
                  onClick={() => {
                    onDelete(reminder._id)
                    setMenuOpen(false)
                  }}
                  className={cn("w-full px-3 py-2 text-sm text-red-500 text-left transition-colors cursor-pointer", isDark ? "hover:bg-red-950/30" : "hover:bg-[#FEF2F2]")}
                >
                  {t("delete")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function ReminderModal({ isOpen, onClose, onSave, editData, t, isDark, appColor }) {
  const [formData, setFormData] = useState(
    editData || {
      title: "",
      description: "",
      date: "",
      time: "09:00",
    }
  )

  const isEdit = !!editData

  const isValid =
    formData.title.trim() &&
    formData.date &&
    formData.time

  const handleSave = () => {
    if (!isValid) return

    const [hour, minute] = formData.time.split(":")

    onSave({
      title: formData.title.trim(),
      description: formData.description.trim(),
      date: formData.date,
      time: {
        hour: Number(hour),
        minute: Number(minute),
      },
    })

    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/20"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "relative max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl shadow-xl border w-full max-w-md p-5 sm:p-6 z-10",
          isDark ? "bg-[#252525] border-[#333]" : "bg-white border-[#E5E7EB]",
        )}
      >
        <button
          onClick={onClose}
          className={cn("absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer", isDark ? "text-[#aaa] hover:text-white hover:bg-[#333]" : "text-[#193B68] hover:text-[#6B7280] hover:bg-[#F3F4F6]")}
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className={cn("text-lg font-semibold mb-6", isDark ? "text-white" : "text-[#111827]")}>
          {isEdit ? t("editReminder") : t("createReminder")}
        </h2>

        <div className="space-y-4">
          <div>
            <label className={cn("text-sm font-medium mb-1.5 block", isDark ? "text-[#ddd]" : "text-[#374151]")}>
              {t("title")}
            </label>

            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  title: e.target.value,
                })
              }
              placeholder={t("reminderTitle")}
              className={cn("w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-1 transition-all", isDark ? "bg-[#1a1a1a] border-[#333] text-white placeholder-[#888]" : "bg-white border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF]")}
              style={{ "--tw-ring-color": `${appColor}33` }}
              data-testid="modal-title-input"
            />
          </div>

          <div>
            <label className={cn("text-sm font-medium mb-1.5 block", isDark ? "text-[#ddd]" : "text-[#374151]")}>
              {t("description")}
            </label>

            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              placeholder={t("descriptionOptional")}
              rows={3}
              className={cn("w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-1 transition-all resize-none", isDark ? "bg-[#1a1a1a] border-[#333] text-white placeholder-[#888]" : "bg-white border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF]")}
              data-testid="modal-description-input"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
            <div>
              <label className={cn("text-sm font-medium mb-1.5 block", isDark ? "text-[#ddd]" : "text-[#374151]")}>
                {t("date")}
              </label>

              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    date: e.target.value,
                  })
                }
                className={cn("w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-1 transition-all", isDark ? "bg-[#1a1a1a] border-[#333] text-white" : "bg-white border-[#E5E7EB] text-[#111827]")}
                data-testid="modal-date-input"
              />
            </div>

            <div>
              <label className={cn("text-sm font-medium mb-1.5 block", isDark ? "text-[#ddd]" : "text-[#374151]")}>
                {t("time")}
              </label>

              <input
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    time: e.target.value,
                  })
                }
                className={cn("w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-1 transition-all", isDark ? "bg-[#1a1a1a] border-[#333] text-white" : "bg-white border-[#E5E7EB] text-[#111827]")}
                data-testid="modal-time-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2 min-[420px]:grid-cols-2">
            <button
              onClick={onClose}
              className={cn("py-3 border rounded-xl text-sm font-medium transition-colors cursor-pointer", isDark ? "border-[#333] text-[#ddd] hover:bg-[#2a2a2a]" : "border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]")}
              data-testid="modal-cancel"
            >
              {t("cancel")}
            </button>

            <button
              onClick={handleSave}
              disabled={!isValid}
              className="py-3 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              style={{ backgroundColor: appColor }}
              data-testid="modal-save"
            >
              {isEdit ? t("save") : t("create")}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function RemindersPage() {
  const navigate = useNavigate()
  const { t, prefs, resolvedTheme } = useApp()
  const language = prefs.language || "en"
  const isDark = resolvedTheme === "dark"
  const appColor = prefs.appColor || prefs.accentColor || "#193B68"

  const [reminders, setReminders] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState(null)

const fetchReminders = useCallback(async () => {
  try {
    const data = await getReminders()

    setReminders(Array.isArray(data.items) ? data.items : [])
  } catch (err) {
    console.error(err)
    toast.error(err.message || t("createReminderError"))
    setReminders([])
  }
}, [t])

  useEffect(() => {
    fetchReminders()
  }, [fetchReminders])

  const filteredReminders = reminders.filter((r) => {
    const query = searchQuery.toLowerCase()

    return (
      (r.title || "").toLowerCase().includes(query) ||
      (r.description || "").toLowerCase().includes(query)
    )
  })

  const handleEdit = (reminder) => {
    setEditingReminder(reminder)
    setModalOpen(true)
  }

  const handleSave = async (data) => {
    try {
      if (editingReminder) {
        const updatedReminder = await updateReminder(
          editingReminder._id,
          data
        )

        setReminders((prev) =>
          prev.map((r) =>
            r._id === updatedReminder._id
              ? updatedReminder
              : r
          )
        )
      } else {
        const newReminder = await createReminder(data)

        setReminders((prev) => [
          ...prev,
          newReminder,
        ])
        setupReminderNotifications().catch(() => {})
      }

      setEditingReminder(null)
      setModalOpen(false)
      toast.success(t("saved"))
    } catch (err) {
      console.error(err)
      toast.error(err.message || t("saveFailed"))
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteReminder(id)

      setReminders((prev) =>
        prev.filter((r) => r._id !== id)
      )
    } catch (err) {
      console.error(err)
      toast.error(err.message || t("saveFailed"))
    }
  }

  const openCreateModal = () => {
    setEditingReminder(null)
    setModalOpen(true)
  }

  return (
    <div
      className={cn("min-h-screen", isDark ? "bg-[#1a1a1a]" : "bg-[#FAFBFC]")}
      data-testid="reminders-page"
    >
      {/* Header */}
      <header className={cn("border-b sticky top-0 z-10", isDark ? "bg-[#222] border-[#333]" : "bg-white border-[#E5E7EB]")}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className={cn("p-2 rounded-lg flex items-center justify-center transition-colors cursor-pointer", isDark ? "text-[#aaa] hover:text-white hover:bg-[#333]" : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]")}
              data-testid="back-button"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 min-w-0">
              <BrandLogo
                logoClassName="w-8 h-8"
                textClassName={cn("hidden min-[390px]:inline text-sm sm:text-base", isDark ? "text-white" : "text-[#111827]")}
              />

              <h1 className={cn("text-lg font-semibold truncate", isDark ? "text-white" : "text-[#111827]")}>
                {t("myReminders")}
              </h1>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-all cursor-pointer"
            style={{ backgroundColor: appColor }}
            data-testid="create-reminder-button"
          >
            <Plus className="w-4 h-4" />

            <span className="hidden sm:inline">
              {t("create")}
            </span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: appColor }} />

            <input
              type="text"
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              placeholder={t("searchReminders")}
              className={cn("w-full pl-11 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-1 transition-all", isDark ? "bg-[#252525] border-[#333] text-white placeholder-[#888]" : "bg-white border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF]")}
              data-testid="search-input"
            />
          </div>
        </div>

        {/* Reminders list */}
        <div className="space-y-3">
          <AnimatePresence>
            {filteredReminders.map((reminder) => (
              <ReminderCard
                key={reminder._id || reminder.id}
                reminder={reminder}
                onEdit={handleEdit}
                onDelete={handleDelete}
                t={t}
                language={language}
                isDark={isDark}
                appColor={appColor}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {filteredReminders.length === 0 && (
          <div className="text-center py-16">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4", isDark ? "bg-[#252525]" : "bg-[#F3F4F6]")}>
              <Clock className="w-6 h-6" style={{ color: appColor }} />
            </div>

            <p className={cn("text-sm", isDark ? "text-[#aaa]" : "text-[#6B7280]")}>
              {searchQuery
                ? t("noMatch")
                : t("noReminders")}
            </p>

            {!searchQuery && (
              <button
                onClick={openCreateModal}
                className="mt-4 text-sm font-medium hover:underline cursor-pointer"
                style={{ color: appColor }}
              >
                {t("createFirst")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <ReminderModal
            isOpen={modalOpen}
            onClose={() => {
              setModalOpen(false)
              setEditingReminder(null)
            }}
            onSave={handleSave}
            t={t}
            isDark={isDark}
            appColor={appColor}
            editData={
              editingReminder
                ? {
                    title: editingReminder.title,
                    description:
                      editingReminder.description,
                    date: editingReminder.reminderDate || editingReminder.date,
                    time: editingReminder.reminderTime || (
                      typeof editingReminder.time === "string"
                        ? editingReminder.time
                        : `${String(editingReminder.time?.hour || 9).padStart(2, "0")}:${String(editingReminder.time?.minute || 0).padStart(2, "0")}`
                    ),
                  }
                : null
            }
          />
        )}
      </AnimatePresence>
    </div>
  )
}
