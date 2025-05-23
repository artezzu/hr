'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import Link from 'next/link';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  UsersIcon,
  FolderIcon,
  CalendarIcon,
  ChartPieIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  UserPlusIcon,
  BellIcon,
  BriefcaseIcon,
  SparklesIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { config } from '@/config';
import { useAuth } from '@/lib/useAuth';
import NotificationBell from '@/components/ui/notification-bell';
import NotificationListener from '@/components/notification-listener';

const navigation = [
  { name: 'Дашборд', href: '/dashboard', icon: HomeIcon },
  { name: 'Сотрудники', href: '/dashboard/employees', icon: UsersIcon },
  { name: 'Заявки', href: '/dashboard/applications', icon: UserPlusIcon },
  { name: 'Вакансии', href: '/dashboard/vacancies', icon: BriefcaseIcon },
  { name: 'HeadHunter', href: '/dashboard/headhunter', icon: BriefcaseIcon },
  { name: 'HH Кандидаты', href: '/dashboard/hh-candidates', icon: UsersIcon },
  { name: 'Документы', href: '/dashboard/documents', icon: FolderIcon },
  { name: 'Календарь', href: '/dashboard/calendar', icon: CalendarIcon },
  { name: 'Аналитика', href: '/dashboard/analytics', icon: ChartPieIcon },
  { name: 'Рассылки', href: '/dashboard/broadcasts', icon: PaperAirplaneIcon },
  { name: 'Спросить у ИИ', href: '/dashboard/ai-chat', icon: SparklesIcon },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const { hasManagerAccess } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  // Фильтруем навигацию в зависимости от прав пользователя
  const filteredNavigation = navigation.filter(item => {
    // Скрываем страницу "Сотрудники" для обычных пользователей
    if (item.name === 'Сотрудники' && !hasManagerAccess()) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50 lg:hidden"
          onClose={setSidebarOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4 ring-1 ring-white/10">
                  <div className="flex h-16 shrink-0 items-center">
                    <h1 className="text-2xl font-bold text-white">Abstract</h1>
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-1">
                          {filteredNavigation.map((item) => (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                className={classNames(
                                  'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold',
                                  'text-gray-400 hover:text-white hover:bg-gray-800'
                                )}
                              >
                                <item.icon
                                  className="h-6 w-6 shrink-0"
                                  aria-hidden="true"
                                />
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                      <li className="mt-auto">
                        <button
                          onClick={handleLogout}
                          className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-800 hover:text-white w-full"
                        >
                          <Cog6ToothIcon
                            className="h-6 w-6 shrink-0"
                            aria-hidden="true"
                          />
                          Выйти
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <h1 className="text-2xl font-bold text-white">Abstract</h1>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {filteredNavigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={classNames(
                          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold',
                          'text-gray-400 hover:text-white hover:bg-gray-800'
                        )}
                      >
                        <item.icon
                          className="h-6 w-6 shrink-0"
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="mt-auto">
                <button
                  onClick={handleLogout}
                  className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-800 hover:text-white w-full"
                >
                  <Cog6ToothIcon
                    className="h-6 w-6 shrink-0"
                    aria-hidden="true"
                  />
                  Выйти
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="lg:pl-72">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-700 bg-gray-900 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-400 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <NotificationBell />

              <Link
                href="/dashboard/profile"
                className="-m-2.5 p-2.5 text-gray-400 hover:text-white"
              >
                <span className="sr-only">Your profile</span>
                <UserCircleIcon className="h-6 w-6" aria-hidden="true" />
              </Link>
              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-700" />
              <button
                onClick={handleLogout}
                className="-m-2.5 p-2.5 text-gray-400 hover:text-white"
              >
                <span className="sr-only">Выйти</span>
                <Cog6ToothIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
      
      <NotificationListener />
    </div>
  );
} 