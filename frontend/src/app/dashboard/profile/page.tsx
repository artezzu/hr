"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { config } from "@/config";

// Функция для проверки валидности email
const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    position: "",
  });

  useEffect(() => {
    // Get user data from localStorage
    const storedName = localStorage.getItem("user_name") || "";
    const email = localStorage.getItem("user_email") || "";
    const position = localStorage.getItem("user_position") || "HR Manager";
    
    // Split the full name into first and last name
    const nameParts = storedName.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    
    setUser({
      firstName,
      lastName,
      email,
      position,
    });
  }, []);

  const handleSave = async () => {
    try {
      // Проверка валидности данных
      if (!user.firstName.trim()) {
        setError("Имя не может быть пустым");
        return;
      }

      if (user.email && !isValidEmail(user.email)) {
        setError("Пожалуйста, введите корректный email адрес");
        return;
      }
      
      setIsSaving(true);
      setError(null);
      
      // Combine first and last name
      const fullName = `${user.firstName} ${user.lastName}`.trim();
      
      // Save to localStorage first
      localStorage.setItem("user_name", fullName);
      localStorage.setItem("user_email", user.email);
      localStorage.setItem("user_position", user.position);
      
      // Then update on server
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Необходима авторизация");
      }
      
      const response = await fetch(`${config.apiUrl}/users/me/update`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          full_name: fullName,
          email: user.email || null // Если email пустой, отправляем null
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData && errorData.detail) {
          throw new Error(errorData.detail);
        }
        throw new Error("Ошибка при обновлении профиля");
      }
      
      // Завершаем редактирование
      setIsEditing(false);
      
      // Reload page to reflect changes across the app
      window.location.reload();
    } catch (err: any) {
      console.error("Ошибка при сохранении профиля:", err);
      setError(err.message || "Произошла ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form and exit editing mode
    const storedName = localStorage.getItem("user_name") || "";
    const nameParts = storedName.split(" ");
    
    setUser({
      ...user,
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
    });
    
    setIsEditing(false);
    setError(null);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="p-6 bg-slate-800 rounded-lg border border-slate-700 shadow">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-shrink-0">
            <div className="h-24 w-24 rounded-full bg-blue-800 flex items-center justify-center text-3xl font-bold text-white border-2 border-blue-500">
              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
            </div>
          </div>
          <div className="flex-grow">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold mb-1">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Input
                        value={user.firstName}
                        onChange={(e) => setUser({ ...user, firstName: e.target.value })}
                        placeholder="Имя"
                        className="max-w-[200px]"
                      />
                      <Input
                        value={user.lastName}
                        onChange={(e) => setUser({ ...user, lastName: e.target.value })}
                        placeholder="Фамилия"
                        className="max-w-[200px]"
                      />
                    </div>
                  ) : (
                    `${user.firstName} ${user.lastName}`
                  )}
                </h1>
                <p className="text-slate-400">{user.position}</p>
              </div>
              {isEditing ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                    Отмена
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Сохранение..." : "Сохранить"}
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  Редактировать профиль
                </Button>
              )}
            </div>

            {error && (
              <div className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded-md text-red-300">
                {error}
              </div>
            )}

            <Tabs defaultValue="basic" className="mt-6">
              <TabsList>
                <TabsTrigger value="basic">Основная информация</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="mt-4">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">Email</label>
                      <Input 
                        value={user.email} 
                        disabled={!isEditing || isSaving}
                        onChange={(e) => setUser({ ...user, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">Должность</label>
                      <Input 
                        value={user.position} 
                        disabled={!isEditing || isSaving}
                        onChange={(e) => setUser({ ...user, position: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
} 