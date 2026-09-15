import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc } from 'firebase/firestore';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Trophy, 
  Users, 
  Clock, 
  CheckCircle2, 
  QrCode, 
  ShieldCheck, 
  ExternalLink,
  Share2,
  Check
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { EventItem } from '../../types';
import { INITIAL_EVENTS } from '../../lib/mockData';
import { EventClubhouse } from './EventClubhouse';
import { MetadataUtility } from '../SEO/MetadataUtility';
import { cachedGetDoc } from '../../services/firestoreCacheService';

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <EventClubhouse eventIdProp={id} />;
};

