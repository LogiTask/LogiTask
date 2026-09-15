import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ClientCalendar from '../components/Calendar/ClientCalendar';
import ClientListItem from '../components/Client/ClientListItem';
import ClientProperties from '../components/Client/ClientProperties';
import TopBar from '../components/Layout/TopBar';
import BottomBar from '../components/Layout/BottomBar';
import AddClientModal from '../components/Client/AddClientModal';
import DailyReschedule from '../components/Daily/DailyReschedule';
import DailyStatsModal from '../components/Daily/DailyStatsModal';
import NoteSection from '../components/Notes/NoteSection';
import { ClientDataID, Job } from '../types/interfaces';
import { updateClientInCaches } from '../utils/cacheUpdates';
import api from "../api"
import '../styles/pages/App.css';

import { useQueryClient } from '@tanstack/react-query';
import { useClients } from '../hooks/useClients';
import { useTodaysJobs } from '../hooks/useJobs';
import { useTodaysPayments } from '../hooks/useTodaysPayments';

import { DndContext, pointerWithin, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableDailyList from '../components/Daily/SortableDailyList';
import TeamModal from '../components/Company/CompanyTeamModal';
import { useUser } from '../contexts/userContext';

import LoadingList from '../components/Loading/LoadingList';
import LoadingJob from '../components/Loading/LoadingJobs';

const renderStars = (count: number): JSX.Element[] => (
  Array.from({ length: count }, (_, i) => <span key={i} className="star">★</span>)
);

const restrictWithinWindow = ({ transform }: { transform: { x: number; y: number; scaleX: number; scaleY: number } }) => {
  const windowWidth = window.innerWidth;
  const maxRightDistance  = 0.2 * windowWidth;
  const maxLeftDistance = windowWidth * 0.66;
  
  return {
    ...transform,
    x: Math.max(-maxLeftDistance, Math.min(maxRightDistance, transform.x))
  };
};
const getUTCISOString = () => new Date().toISOString();

// Main Component
const Home: React.FC = () => {
  const user = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedItemId, setFocusedItemId] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState<string>('none');
  const [modeType, setModeType] = useState(()=>{
    if (user.role === 'WORKER') {
      return 'Daily';
    }
    return localStorage.getItem('mode') || "Client";
  });
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [showDailyStats, setShowDailyStats] = useState(false);
  const [isModeRotated, setIsModeRotated] = useState(false);
  const { clients, isLoading: isClientLoading } = useClients( modeType === 'Client');
  const queryClient = useQueryClient();
  const focusedElementRef = useRef<HTMLDivElement | null>(null);
  const { jobs, isLoading: isJobLoading } = useTodaysJobs(modeType === 'Daily');
  const { data: paymentsData } = useTodaysPayments(modeType === 'Daily' && showDailyStats);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isDraggingDisabled, setIsDraggingDisabled] = useState(false);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const jobsRef = useRef<Job[]>(jobs);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const handleClientUpdated = useCallback((updatedClient: ClientDataID) => {
    updateClientInCaches(queryClient, updatedClient);
  }, [queryClient]);

  // Handle job completion toggle
  const handleJobComplete = useCallback(async (jobId: number) => {
    try {
      const job = jobsRef.current.find(job => job.id === jobId);

      if (!job) return;

      const newStatus = job.status === 'complete' ? 'uncomplete' : 'complete';
      const dateTime = newStatus === 'complete' ? getUTCISOString() : null;

      const response = await api.patch(`/api/Update-Schedule/${jobId}/`, {
        status: newStatus, complete_date:dateTime
      });

      // Only update job cache if the request was successful
      if (response.status === 200) {
        console.log('Job status updated successfully with dateTime:', dateTime, " for job ID:", jobId);
        
        queryClient.setQueryData(['todaysJobs'], (oldJobs: Job[] | undefined) => {
          if (!oldJobs) return [];
          return oldJobs.map(job => 
            job.id === jobId ? { ...job, status: newStatus } : job
          );
        });
        
        setSelectedJob(prev => {
          if (!prev || prev.id !== jobId) {
            return prev;
          }
          return { ...prev, status: newStatus };
        });
      }
    } catch (error) {
      console.error('Error toggling job completion:', error);
    }
  }, [queryClient]);

  // Event Handlers
  const handleModeClick = useCallback(async () => {
    const newMode = modeType === 'Client' ? 'Daily' : 'Client';
    localStorage.setItem('mode',newMode)
    setModeType(newMode);
    setIsModeRotated(prev => !prev);
  }, [modeType]);

  const handleTeamModalOpen = useCallback(() => {
    setIsTeamModalOpen(true);
  }, []);

  const handleTeamModalClose = useCallback(() => {
    setIsTeamModalOpen(false);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const noop = useCallback(() => {}, []);

  const handleSortChange = useCallback((option: string) => {
    setSortOption(option);
  }, []);

  const handleStatsToggle = useCallback(() => {
    setShowDailyStats(prev => !prev);
  }, []);

  const openAddClientModal = useCallback(() => {
    setIsAddClientModalOpen(true);
  }, []);

  const closeAddClientModal = useCallback(() => {
    setIsAddClientModalOpen(false);
  }, []);

  // Memoized filtering and sorting functions
  const filterClientsByMode = useCallback((clients: ClientDataID[]): ClientDataID[] => {
    return clients;
  }, []);

  const filterClientsBySearch = useCallback((clients: ClientDataID[]): ClientDataID[] => 
    clients.filter(client =>
      [client.firstName, client.lastName, client.phoneNumber, client.email, client.properties?.[0]?.street, client.properties?.[0]?.zipCode]
        .some(field => field?.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [searchTerm]);

  const filterJobsBySearch = useCallback((jobs: Job[]): Job[] =>
    jobs.filter(job => job ?
      [job.client.firstName, job.client.lastName, job.property.street, job.client.phoneNumber, job.client.email, job.property.zipCode]
        .some(field => field?.toLowerCase().includes(searchTerm.toLowerCase()))
        : false
    ), [searchTerm]);

  // Memoized filtered jobs
  const filteredJobs = useMemo(() => filterJobsBySearch(jobs), [filterJobsBySearch, jobs]);

  const sortClients = useCallback((clients: ClientDataID[]): ClientDataID[] =>
    [...clients].sort((a, b) => {
      switch (sortOption) {
        case 'firstName': return a.firstName.localeCompare(b.firstName);
        case 'phoneNumber': return a.phoneNumber.localeCompare(b.phoneNumber);
        default: return 0;
      }
    }), [sortOption]);

  const filteredClients = useMemo(() => 
    sortClients(filterClientsBySearch(filterClientsByMode(clients || [])) || []), 
    [sortClients, filterClientsBySearch, filterClientsByMode, clients]
  );

  const selectedClient = useMemo(() => 
    focusedItemId !== null ? filteredClients.find(client => client.id === focusedItemId) ?? null : null,
    [focusedItemId, filteredClients]
  );

  const navigateFocusedItem = useCallback((direction: number) => {
    if (modeType === 'Client') {
      if (filteredClients.length === 0) return;
      
      setFocusedItemId(prevId => {
        const currentIndex = filteredClients.findIndex(client => client.id === prevId);
        const newIndex = Math.min(Math.max(currentIndex + direction, 0), filteredClients.length - 1);
        return filteredClients[newIndex]?.id ?? null;
      });
    } else {
      if (filteredJobs.length === 0) return;
      
      const currentJobIndex = filteredJobs.findIndex(job => job.id === focusedItemId);
      const newJobIndex = Math.min(Math.max(currentJobIndex + direction, 0), filteredJobs.length - 1);
      const selectedJob = filteredJobs[newJobIndex];
      
      if (selectedJob) {
        setFocusedItemId(selectedJob.id);
        setSelectedJob(selectedJob);
      }
    }
  }, [modeType, filteredClients, filteredJobs, focusedItemId]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAddClientModalOpen || isPropertyModalOpen) {
        return;
      }
      
      // Check if the event target is an input, textarea, or other form element
      const target = e.target as HTMLElement;
      const isFormElement = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT' ||
        target.isContentEditable;
        
      // Don't capture keystrokes when user is typing in a form element
      if (isFormElement) {
        return;
      }
      
      if (e.key === 'Backspace') {
        setSearchTerm(prev => prev.slice(0, -1));
      }
      else if (/^[a-zA-Z0-9,.\s]$/.test(e.key)) {
        setSearchTerm(prev => prev + e.key);
      }
      else if (e.key === 'ArrowRight') {
        navigateFocusedItem(1);
      }
      else if (e.key === 'ArrowLeft') {
        navigateFocusedItem(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateFocusedItem, isAddClientModalOpen, isPropertyModalOpen]);

  // Automatically focus the first or reset focus when needed
  useEffect(() => {
    if (modeType === 'Client') {
      if (filteredClients.length === 1) setFocusedItemId(filteredClients[0].id);
      else if (filteredClients.length > 1 && !filteredClients.some(client => client.id === focusedItemId)) {
        setFocusedItemId(null);
      }
    } else {
        // Daily mode - use filteredJobs instead of jobs
        if (filteredJobs.length === 1) {
          // Auto-focus when exactly one job matches the search
          setFocusedItemId(filteredJobs[0].id);
          setSelectedJob(filteredJobs[0]);
        } 
        else if (filteredJobs.length > 1 && (!focusedItemId || !filteredJobs.some(job => job.id === focusedItemId))) {
          setFocusedItemId(null);
          setSelectedJob(null);
        }
    }
  }, [filteredClients, filteredJobs, focusedItemId, modeType]);

  // This effect runs whenever focusedItemId changes
  useEffect(() => {
    if (modeType === 'Client' && clients?.length === 0) return;
    if (modeType === 'Daily' && jobs.length === 0) return;

    const selector = modeType === 'Client'
      ? `[data-client-id="${focusedItemId}"]`
      : `[data-job-id="${focusedItemId}"]`;
    
    const focusedElement = document.querySelector(selector);
    if (focusedElement) {
      focusedElementRef.current = focusedElement as HTMLDivElement;
      focusedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [focusedItemId, modeType, clients?.length, jobs.length]);

  const handleClientClick = useCallback((id: number) => {
    setFocusedItemId(id);
    sessionStorage.setItem('lastFocusedClientId', id.toString());
  }, []);

  const handleJobClick = useCallback((id: number) => {
    setFocusedItemId(id);
    setSelectedJob(jobs.find(job => job.id === id) || null);
    sessionStorage.setItem('lastFocusedJobId', id.toString());
  }, [jobs]);

  // Handle property modal state changes
  const handlePropertyModalStateChange = useCallback((isOpen: boolean) => {
    setIsPropertyModalOpen(isOpen);
  }, []);
   
  useEffect(() => {
    if (modeType === "Client") {
      const savedFocusedId = sessionStorage.getItem('lastFocusedClientId');
      if (savedFocusedId) {
        setFocusedItemId(parseInt(savedFocusedId));
      }
    } else {
      const savedFocusedId = sessionStorage.getItem('lastFocusedJobId');
      if (savedFocusedId) {
        setFocusedItemId(parseInt(savedFocusedId));
      }
    }
  }, [modeType]);

  useEffect(() => {
    if (modeType === 'Daily' && focusedItemId && jobs.length > 0) {
      const job = jobs.find(job => job.id === focusedItemId);
      if (job) {
        setSelectedJob(job);
      }
    }
  }, [focusedItemId, jobs, modeType]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveJobId(null);
    setIsDragging(false);
    
    if (!over) return;
    if (active.id === over.id) {
      console.log('Dropped on itself, no action taken');
      return;
    }
  
    if (over.id.toString().includes('droppable-')) {
      const dayIndex = parseInt(over.id.toString().split('-')[1]);

      try {
        const tz = localStorage.getItem("userTimeZone") || "America/Chicago";
        const target = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
        target.setHours(0, 0, 0, 0);
        target.setDate(target.getDate() + dayIndex);

        const formattedDate = target.toISOString().slice(0, 10);

        const response = await api.patch(`/api/Update-Schedule/${active.id}/`, {
          jobDate: formattedDate,
        });
        if (response.status === 200) {
            console.log('Job rescheduled successfully');
            queryClient.invalidateQueries({ queryKey: ['todaysJobs'] });
          }
      } catch (error) {
        console.error('Error rescheduling job:', error);
        alert('Failed to reschedule job');
      }
    }

    if (over.id == 'delete-job') {
      try {
        const response = await api.delete(`/api/job/delete/${active.id}/`, {});
        if (response.status === 204) {
          console.log('Job deleted successfully');
          queryClient.invalidateQueries({ queryKey: ['todaysJobs'] });
        }
      } catch (error) {
        console.error('Error deleting job:', error);
        alert('Failed to delete job');
      }
    }

    if (over && active.id !== over.id) {
      queryClient.setQueryData(['todaysJobs'], (oldJobs: Job[] | undefined) => {
        if (!oldJobs) return [];
        
        const jobs = [...oldJobs];
        const oldIndex = jobs.findIndex(job => job.id === active.id);
        const newIndex = jobs.findIndex(job => job.id === over.id);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const [movedJob] = jobs.splice(oldIndex, 1);
          jobs.splice(newIndex, 0, movedJob);
        }
        
        return jobs;
    });
}
  }, [queryClient]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveJobId(active.id as number)
    setIsDragging(true);
  }, []);

  const toggleDraggingEnabled = useCallback((isDisabled: boolean) => {
    setIsDraggingDisabled(isDisabled);
  }, []);

  // Memoize the active job for DragOverlay
  const activeJob = useMemo(() => 
    activeJobId ? jobs.find(job => job.id === activeJobId) : null,
    [activeJobId, jobs]
  );
  
  return (
    <div
      className="app-container" 
    >      
      {modeType === 'Client' && selectedClient && !isPropertyModalOpen && (
        <ClientCalendar visits={[]} client_id={focusedItemId?focusedItemId:null} />
      )}
    
      <TopBar
        focusedItemId={focusedItemId}
        selectedClient={selectedClient}
        selectedJob={selectedJob}
        mode={modeType as 'Client' | 'Daily'}
        sortOption={sortOption}
        handleSortChange={handleSortChange}
      />

      <div className="search-container">
          <input
            type="text"
            className={`search-bar ${searchTerm ? 'active' : ''}`}
            value={searchTerm}
            onChange={handleChange}
            placeholder={modeType === 'Client' ? "Search clients..." : "Search jobs..."}
            spellCheck={false}
            inputMode='text'
          />
      </div>
    
      <ul className="right-aligned-list">
        {modeType === 'Client' ? (
          isClientLoading ? ( 
            <div className="loading-container">
              <LoadingList />
            </div>
          ) :
          filteredClients.map((client: ClientDataID) => (
            <div 
              key={client.id} 
              className="client-wrapper"
              data-client-id={client.id}
            >
              <ClientListItem
                client={client}
                isFocused={focusedItemId === client.id}
                onClick={handleClientClick}
                renderStars={renderStars}
                onClientUpdated={handleClientUpdated}
              />
              
              <ClientProperties 
                client={client} 
                visible={focusedItemId === client.id}
                onPropertyModalStateChange={handlePropertyModalStateChange}
              />
            </div>
          ))
        ) : (
          // Daily jobs list rendering
          <>
            {isJobLoading ? (
              <LoadingJob />
            )  : filteredJobs.length === 0 ? (
              // No jobs message
              
                <div className="no-jobs-message">
                  <i className="fa-solid fa-clipboard-list no-jobs-icon"></i>
                  <h3>No Jobs to Display</h3>
                  <p>{searchTerm ? "Try different search terms" : "Your schedule is clear for now"}</p>
                </div>
            ) : (
              <>
                <DndContext
                  sensors={sensors}
                  collisionDetection={pointerWithin}
                  onDragEnd={handleDragEnd}
                  onDragStart={handleDragStart}
                  modifiers={[restrictWithinWindow]}
                >

                  <SortableContext
                    items={filteredJobs.map(job => job.id)}
                    strategy={verticalListSortingStrategy}
                  >
                      {filteredJobs.map((job: Job) => (
                        <div 
                          key={job.id}
                          className="job-wrapper"
                          data-job-id={job.id}
                        >
                          <SortableDailyList
                            job={job}
                            isFocused={focusedItemId === job.id}
                            onClick={handleJobClick}
                            onComplete={handleJobComplete}
                            isDisabled={isDraggingDisabled}
                            onModalToggle={toggleDraggingEnabled}
                          />
                        </div>
                      ))}  
                  </SortableContext>
                  <DragOverlay dropAnimation={null} style={{zIndex: 5}}>
                    {activeJob ? (
                      <div 
                        key={activeJob.id}
                        className="job-wrapper"
                        style={{ width: '100%'}}
                      >
                        <SortableDailyList
                          job={activeJob}
                          isFocused={focusedItemId === activeJob.id}
                          onClick={noop}
                          onComplete={handleJobComplete}
                          isDisabled={false}
                          isDragging={true}
                          onModalToggle={toggleDraggingEnabled}
                        />
                      </div>
                    ) : null}
                  </DragOverlay>
                  <DailyReschedule 
                    isDragging={activeJobId !== null && jobs.find(job => job.id === activeJobId)?.status !== 'complete'} 
                  />
                </DndContext>
                <NoteSection 
                  selectedJob={selectedJob} 
                  isDragging={isDragging}
                />
              </>
            )}
          </>
        )}
      </ul>
      
      <BottomBar
        isModeRotated={isModeRotated}
        handleModeClick={handleModeClick}
        openAddClientModal={openAddClientModal}
        onTeamModalOpen={handleTeamModalOpen}
        onStatsToggle={handleStatsToggle}
        modeType={modeType}
        showStats={showDailyStats}
      />
            
      <AddClientModal
        isOpen={isAddClientModalOpen}
        onClose={closeAddClientModal}
      />
      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={handleTeamModalClose}
      />
      <DailyStatsModal
        jobs={jobs}
        payments={paymentsData?.payments || []}
        isVisible={showDailyStats && modeType === 'Daily'}
      />
    </div>
  );
}

export default Home;