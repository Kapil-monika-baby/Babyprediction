'use client';

import { useEffect, useState } from 'react';

export type MemoryLanguage = 'en' | 'hi';

const messages: Record<MemoryLanguage, Record<string, string>> = {
  en: {
    allTimelines: '← All timelines', familyStory: 'Your family story', memories: 'Memories',
    privateIntro: 'A private place for the little things you never want to forget. Every new memory starts private.',
    inviteFamily: 'Invite family', inviteDescription: 'Invite a trusted family member by email. The link expires in seven days and can only be accepted by an account using that email. Email delivery is not configured yet, so you can copy and share the link privately.',
    createInvite: 'Create invitation link', creatingInvite: 'Creating link…', inviteLinkLabel: 'One-time family invitation link', copyInvite: 'Copy invitation link',
    addMemory: 'Add a memory', addMemoryDescription: 'Write a story or save a milestone, photo or short video.',
    memoryType: 'Memory type', writtenStory: 'Written story', milestone: 'Milestone', photo: 'Photo', video: 'Video',
    dateHappened: 'Date it happened', milestoneName: 'Milestone name (optional)', choosePhoto: 'Choose a photo', chooseVideo: 'Choose a video',
    captionStory: 'Caption or story', captionPlaceholder: 'What do you want to remember about this moment?',
    savePrivate: 'Save memory privately', saving: 'Saving memory…', timeline: 'Timeline', loadingTimeline: 'Loading timeline…',
    firstMemory: 'Your first memory is waiting', firstMemoryDescription: 'Add a story, photo or milestone above to start your timeline.',
    shareOne: 'Share only this memory', createGuestLink: 'Create private guest link', creatingGuestLink: 'Creating link…',
    copyGuestLink: 'Copy guest link', revokeAccess: 'Revoke access', deleteMemory: 'Delete memory',
    shareNote: 'Guests can view this item only. The rest of your timeline stays private. Link expires after 30 days.',
    privateFooter: 'This timeline is private. Guest links only show memories you choose to share.',
    language: 'Language', english: 'English', hindi: 'हिन्दी',
  },
  hi: {
    allTimelines: '← सभी टाइमलाइन', familyStory: 'आपकी परिवार की कहानी', memories: 'यादें',
    privateIntro: 'यह उन छोटे-छोटे पलों को सहेजने की निजी जगह है जिन्हें आप हमेशा याद रखना चाहते हैं। हर नई याद निजी रहती है।',
    inviteFamily: 'परिवार को आमंत्रित करें', inviteDescription: 'किसी भरोसेमंद परिवार के सदस्य को ईमेल से आमंत्रित करें। लिंक सात दिनों में समाप्त हो जाता है और केवल उसी ईमेल वाले खाते से स्वीकार किया जा सकता है। अभी ईमेल भेजने की सुविधा सेट नहीं है, इसलिए आप लिंक कॉपी करके निजी रूप से साझा कर सकते हैं।',
    createInvite: 'आमंत्रण लिंक बनाएँ', creatingInvite: 'लिंक बनाया जा रहा है…', inviteLinkLabel: 'एक बार उपयोग होने वाला परिवार आमंत्रण लिंक', copyInvite: 'आमंत्रण लिंक कॉपी करें',
    addMemory: 'एक याद जोड़ें', addMemoryDescription: 'कोई कहानी लिखें या खास पड़ाव, फोटो या छोटा वीडियो सहेजें।',
    memoryType: 'याद का प्रकार', writtenStory: 'लिखी हुई कहानी', milestone: 'खास पड़ाव', photo: 'फोटो', video: 'वीडियो',
    dateHappened: 'यह कब हुआ', milestoneName: 'खास पड़ाव का नाम (वैकल्पिक)', choosePhoto: 'फोटो चुनें', chooseVideo: 'वीडियो चुनें',
    captionStory: 'कैप्शन या कहानी', captionPlaceholder: 'इस पल के बारे में आप क्या याद रखना चाहते हैं?',
    savePrivate: 'याद निजी रूप से सहेजें', saving: 'याद सहेजी जा रही है…', timeline: 'टाइमलाइन', loadingTimeline: 'टाइमलाइन लोड हो रही है…',
    firstMemory: 'आपकी पहली याद आपका इंतज़ार कर रही है', firstMemoryDescription: 'अपनी टाइमलाइन शुरू करने के लिए ऊपर कहानी, फोटो या खास पड़ाव जोड़ें।',
    shareOne: 'सिर्फ यह याद साझा करें', createGuestLink: 'निजी गेस्ट लिंक बनाएँ', creatingGuestLink: 'लिंक बनाया जा रहा है…',
    copyGuestLink: 'गेस्ट लिंक कॉपी करें', revokeAccess: 'पहुँच रद्द करें', deleteMemory: 'याद हटाएँ',
    shareNote: 'मेहमान केवल इसी याद को देख सकते हैं। आपकी बाकी टाइमलाइन निजी रहती है। लिंक 30 दिनों बाद समाप्त हो जाता है।',
    privateFooter: 'यह टाइमलाइन निजी है। गेस्ट लिंक केवल वही यादें दिखाते हैं जिन्हें आप साझा करते हैं।',
    language: 'भाषा', english: 'English', hindi: 'हिन्दी',
  },
};

export function useMemoryLanguage() {
  const [language, setLanguage] = useState<MemoryLanguage>('en');
  useEffect(() => {
    const saved = window.localStorage.getItem('goodnews-memory-language');
    if (saved === 'en' || saved === 'hi') setLanguage(saved);
  }, []);
  function changeLanguage(next: MemoryLanguage) {
    setLanguage(next);
    window.localStorage.setItem('goodnews-memory-language', next);
    document.documentElement.lang = next;
  }
  function t(key: string) {
    return messages[language][key] ?? messages.en[key] ?? key;
  }
  return { language, setLanguage: changeLanguage, t };
}
