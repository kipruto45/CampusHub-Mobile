import { useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { adminManagementAPI } from '../../services/api';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_type: string;
  status: string;
  start_datetime: string;
  end_datetime: string | null;
  color: string;
  is_all_day: boolean;
}

const EVENT_COLORS = {
  announcement: '#3B82F6',
  post: '#10B981',
  email: '#8B5CF6',
  notification: '#F59E0B',
  promotion: '#EF4444',
  maintenance: '#6B7280',
  event: '#EC4899',
};

export default function ContentCalendar() {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [_loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'announcement',
    start_datetime: '',
    end_datetime: '',
    is_all_day: false,
    color: EVENT_COLORS.announcement,
  });

  const currentMonth = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const fetchEvents = useCallback(async () => {
    try {
      const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

      const response = await adminManagementAPI.listContentCalendarEvents({
        start_date: monthStart.toISOString(),
        end_date: monthEnd.toISOString(),
      });
      const data = response?.data?.data ?? response?.data ?? {};
      setEvents(Array.isArray(data?.results) ? data.results : []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const createEvent = async () => {
    if (!newEvent.title || !newEvent.start_datetime) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      await adminManagementAPI.createContentCalendarEvent({
        ...newEvent,
        end_datetime: newEvent.end_datetime || undefined,
      });
      Alert.alert('Success', 'Event created successfully');
      setShowModal(false);
      setNewEvent({
        title: '',
        description: '',
        event_type: 'announcement',
        start_datetime: '',
        end_datetime: '',
        is_all_day: false,
        color: EVENT_COLORS.announcement,
      });
      fetchEvents();
    } catch (_error) {
      Alert.alert('Error', 'Network error');
    }
  };

  const getDaysInMonth = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    
    // Previous month days
    for (let i = 0; i < startingDay; i++) {
      days.push({ day: null, date: null });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, date: new Date(year, month, i) });
    }
    
    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_datetime);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  const renderCalendar = () => {
    const days = getDaysInMonth();
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
      <View style={styles.calendarContainer}>
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={() => navigateMonth(-1)}>
            <Text style={styles.navButton}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{currentMonth}</Text>
          <TouchableOpacity onPress={() => navigateMonth(1)}>
            <Text style={styles.navButton}>›</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.weekDaysRow}>
          {weekDays.map(day => (
            <Text key={day} style={styles.weekDay}>{day}</Text>
          ))}
        </View>
        
        <View style={styles.daysGrid}>
          {days.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                item.date && item.date.toDateString() === new Date().toDateString() && styles.todayCell,
              ]}
              onPress={() => item.date && setSelectedDate(item.date)}
            >
              {item.day && (
                <>
                  <Text style={styles.dayText}>{item.day}</Text>
                  {getEventsForDate(item.date).length > 0 && (
                    <View style={styles.eventDots}>
                      {getEventsForDate(item.date).slice(0, 3).map((event, i) => (
                        <View
                          key={i}
                          style={[styles.eventDot, { backgroundColor: event.color }]}
                        />
                      ))}
                    </View>
                  )}
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderSelectedDateEvents = () => {
    const dayEvents = getEventsForDate(selectedDate);
    
    return (
      <View style={styles.eventsSection}>
        <Text style={styles.sectionTitle}>
          Events for {selectedDate.toLocaleDateString()}
        </Text>
        
        {dayEvents.length === 0 ? (
          <Text style={styles.noEvents}>No events scheduled</Text>
        ) : (
          dayEvents.map(event => (
            <TouchableOpacity key={event.id} style={styles.eventCard}>
              <View style={[styles.eventIndicator, { backgroundColor: event.color }]} />
              <View style={styles.eventDetails}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventType}>
                  {event.event_type} • {event.status}
                </Text>
                <Text style={styles.eventTime}>
                  {new Date(event.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Event</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Content Calendar</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderCalendar()}
        {renderSelectedDateEvents()}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Event</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Event Title"
              value={newEvent.title}
              onChangeText={(text) => setNewEvent({ ...newEvent, title: text })}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              multiline
              value={newEvent.description}
              onChangeText={(text) => setNewEvent({ ...newEvent, description: text })}
            />
            
            <Text style={styles.label}>Event Type</Text>
            <View style={styles.eventTypeContainer}>
              {Object.keys(EVENT_COLORS).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.eventTypeButton,
                    newEvent.event_type === type && styles.eventTypeActive,
                  ]}
                  onPress={() => setNewEvent({
                    ...newEvent,
                    event_type: type,
                    color: EVENT_COLORS[type as keyof typeof EVENT_COLORS],
                  })}
                >
                  <View style={[styles.eventTypeDot, { backgroundColor: EVENT_COLORS[type as keyof typeof EVENT_COLORS] }]} />
                  <Text style={styles.eventTypeText}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Start Date/Time (ISO)"
              value={newEvent.start_datetime}
              onChangeText={(text) => setNewEvent({ ...newEvent, start_datetime: text })}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={createEvent}
              >
                <Text style={styles.submitButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    fontSize: 16,
    color: '#3B82F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  navButton: {
    fontSize: 24,
    color: '#3B82F6',
    paddingHorizontal: 16,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCell: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  dayText: {
    fontSize: 14,
    color: '#1F2937',
  },
  eventDots: {
    flexDirection: 'row',
    marginTop: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  eventsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  noEvents: {
    textAlign: 'center',
    color: '#6B7280',
    paddingVertical: 20,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  eventIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  eventType: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  eventTime: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  eventTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  eventTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    marginBottom: 8,
  },
  eventTypeActive: {
    backgroundColor: '#DBEAFE',
  },
  eventTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  eventTypeText: {
    fontSize: 12,
    color: '#374151',
    textTransform: 'capitalize',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
