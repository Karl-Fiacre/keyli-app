
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "agency_agents_keyli": {
                  Row: {
                    "actif": boolean | null,"agency_user_id": string,"created_at": string | null,"id": string,"nom": string
                  }
                  Insert: {
                    "actif"?: boolean | null,"agency_user_id": string,"created_at"?: string | null,"id"?: string,"nom": string
                  }
                  Update: {
                    "actif"?: boolean | null,"agency_user_id"?: string,"created_at"?: string | null,"id"?: string,"nom"?: string
                  }
                  Relationships: [
                    
                  ]
                },"audit_logs_keyli": {
                  Row: {
                    "action": string,"admin_id": string,"created_at": string | null,"details": Json | null,"entity_id": string | null,"entity_type": string,"id": string
                  }
                  Insert: {
                    "action": string,"admin_id": string,"created_at"?: string | null,"details"?: Json | null,"entity_id"?: string | null,"entity_type": string,"id"?: string
                  }
                  Update: {
                    "action"?: string,"admin_id"?: string,"created_at"?: string | null,"details"?: Json | null,"entity_id"?: string | null,"entity_type"?: string,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"communes_keyli": {
                  Row: {
                    "created_at": string | null,"id": string,"nom": string
                  }
                  Insert: {
                    "created_at"?: string | null,"id"?: string,"nom": string
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"nom"?: string
                  }
                  Relationships: [
                    
                  ]
                },"documents_keyli": {
                  Row: {
                    "created_at": string | null,"doc_type": Database["public"]['Enums']["document_type_keyli"],"file_url": string,"id": string,"property_id": string | null,"review_notes": string | null,"reviewed_at": string | null,"status": Database["public"]['Enums']["document_status_keyli"] | null,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string | null,"doc_type": Database["public"]['Enums']["document_type_keyli"],"file_url": string,"id"?: string,"property_id"?: string | null,"review_notes"?: string | null,"reviewed_at"?: string | null,"status"?: Database["public"]['Enums']["document_status_keyli"] | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string | null,"doc_type"?: Database["public"]['Enums']["document_type_keyli"],"file_url"?: string,"id"?: string,"property_id"?: string | null,"review_notes"?: string | null,"reviewed_at"?: string | null,"status"?: Database["public"]['Enums']["document_status_keyli"] | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_keyli_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties_keyli"
      referencedColumns: ["id"]
    }
                  ]
                },"favorites_keyli": {
                  Row: {
                    "created_at": string | null,"id": string,"property_id": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string | null,"id"?: string,"property_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"property_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "favorites_keyli_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties_keyli"
      referencedColumns: ["id"]
    }
                  ]
                },"feedback_keyli": {
                  Row: {
                    "admin_response": string | null,"created_at": string | null,"id": string,"message": string,"status": string | null,"subject": string,"type": string | null,"updated_at": string | null,"user_id": string
                  }
                  Insert: {
                    "admin_response"?: string | null,"created_at"?: string | null,"id"?: string,"message": string,"status"?: string | null,"subject": string,"type"?: string | null,"updated_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "admin_response"?: string | null,"created_at"?: string | null,"id"?: string,"message"?: string,"status"?: string | null,"subject"?: string,"type"?: string | null,"updated_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"inscription_pilot_keyli": {
                  Row: {
                    "budget": number | null,"city": string | null,"created_at": string | null,"email": string,"first_name": string | null,"id": string,"last_name": string | null,"message": string | null,"phone": string | null,"priority_level": Database["public"]['Enums']["priority_level_keyli"] | null,"property_type": Database["public"]['Enums']["property_type_keyli"] | null,"source": string | null,"status": Database["public"]['Enums']["inscription_status_keyli"] | null,"updated_at": string | null
                  }
                  Insert: {
                    "budget"?: number | null,"city"?: string | null,"created_at"?: string | null,"email": string,"first_name"?: string | null,"id"?: string,"last_name"?: string | null,"message"?: string | null,"phone"?: string | null,"priority_level"?: Database["public"]['Enums']["priority_level_keyli"] | null,"property_type"?: Database["public"]['Enums']["property_type_keyli"] | null,"source"?: string | null,"status"?: Database["public"]['Enums']["inscription_status_keyli"] | null,"updated_at"?: string | null
                  }
                  Update: {
                    "budget"?: number | null,"city"?: string | null,"created_at"?: string | null,"email"?: string,"first_name"?: string | null,"id"?: string,"last_name"?: string | null,"message"?: string | null,"phone"?: string | null,"priority_level"?: Database["public"]['Enums']["priority_level_keyli"] | null,"property_type"?: Database["public"]['Enums']["property_type_keyli"] | null,"source"?: string | null,"status"?: Database["public"]['Enums']["inscription_status_keyli"] | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"leads_keyli": {
                  Row: {
                    "agent_id": string | null,"contact_nom": string | null,"contact_user_id": string | null,"created_at": string | null,"id": string,"owner_id": string,"property_id": string,"source_message_id": string | null,"stage": Database["public"]['Enums']["lead_stage_keyli"] | null,"updated_at": string | null
                  }
                  Insert: {
                    "agent_id"?: string | null,"contact_nom"?: string | null,"contact_user_id"?: string | null,"created_at"?: string | null,"id"?: string,"owner_id": string,"property_id": string,"source_message_id"?: string | null,"stage"?: Database["public"]['Enums']["lead_stage_keyli"] | null,"updated_at"?: string | null
                  }
                  Update: {
                    "agent_id"?: string | null,"contact_nom"?: string | null,"contact_user_id"?: string | null,"created_at"?: string | null,"id"?: string,"owner_id"?: string,"property_id"?: string,"source_message_id"?: string | null,"stage"?: Database["public"]['Enums']["lead_stage_keyli"] | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "leads_keyli_agent_id_fkey"
      columns: ["agent_id"]
isOneToOne: false
      referencedRelation: "agency_agents_keyli"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leads_keyli_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties_keyli"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leads_keyli_source_message_id_fkey"
      columns: ["source_message_id"]
isOneToOne: false
      referencedRelation: "messages_keyli"
      referencedColumns: ["id"]
    }
                  ]
                },"marketing_templates_keyli": {
                  Row: {
                    "content": string,"created_at": string | null,"created_by": string | null,"id": string,"image_url": string | null,"name": string,"target_audience": string | null,"title": string | null,"type": string,"updated_at": string | null
                  }
                  Insert: {
                    "content": string,"created_at"?: string | null,"created_by"?: string | null,"id"?: string,"image_url"?: string | null,"name": string,"target_audience"?: string | null,"title"?: string | null,"type": string,"updated_at"?: string | null
                  }
                  Update: {
                    "content"?: string,"created_at"?: string | null,"created_by"?: string | null,"id"?: string,"image_url"?: string | null,"name"?: string,"target_audience"?: string | null,"title"?: string | null,"type"?: string,"updated_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"messages_keyli": {
                  Row: {
                    "body": string,"created_at": string | null,"from_user": string,"id": string,"property_id": string | null,"read": boolean | null,"to_user": string
                  }
                  Insert: {
                    "body": string,"created_at"?: string | null,"from_user": string,"id"?: string,"property_id"?: string | null,"read"?: boolean | null,"to_user": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string | null,"from_user"?: string,"id"?: string,"property_id"?: string | null,"read"?: boolean | null,"to_user"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_keyli_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties_keyli"
      referencedColumns: ["id"]
    }
                  ]
                },"onboarding_checklists_keyli": {
                  Row: {
                    "completed": boolean | null,"completed_at": string | null,"created_at": string | null,"id": string,"notes": string | null,"step": string,"updated_at": string | null,"user_id": string
                  }
                  Insert: {
                    "completed"?: boolean | null,"completed_at"?: string | null,"created_at"?: string | null,"id"?: string,"notes"?: string | null,"step": string,"updated_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "completed"?: boolean | null,"completed_at"?: string | null,"created_at"?: string | null,"id"?: string,"notes"?: string | null,"step"?: string,"updated_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"payment_attempts_keyli": {
                  Row: {
                    "amount": number | null,"created_at": string | null,"email": string | null,"error_message": string | null,"id": string,"paystack_reference": string | null,"plan_id": string | null,"status": string | null,"user_id": string | null
                  }
                  Insert: {
                    "amount"?: number | null,"created_at"?: string | null,"email"?: string | null,"error_message"?: string | null,"id"?: string,"paystack_reference"?: string | null,"plan_id"?: string | null,"status"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "amount"?: number | null,"created_at"?: string | null,"email"?: string | null,"error_message"?: string | null,"id"?: string,"paystack_reference"?: string | null,"plan_id"?: string | null,"status"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_attempts_keyli_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans_keyli"
      referencedColumns: ["id"]
    }
                  ]
                },"plans_keyli": {
                  Row: {
                    "actif": boolean | null,"code": string,"created_at": string | null,"id": string,"nom": string,"prix_depassement_unitaire": number | null,"prix_mensuel": number,"seuil_max": number | null,"seuil_min": number,"updated_at": string | null
                  }
                  Insert: {
                    "actif"?: boolean | null,"code": string,"created_at"?: string | null,"id"?: string,"nom": string,"prix_depassement_unitaire"?: number | null,"prix_mensuel": number,"seuil_max"?: number | null,"seuil_min": number,"updated_at"?: string | null
                  }
                  Update: {
                    "actif"?: boolean | null,"code"?: string,"created_at"?: string | null,"id"?: string,"nom"?: string,"prix_depassement_unitaire"?: number | null,"prix_mensuel"?: number,"seuil_max"?: number | null,"seuil_min"?: number,"updated_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"profiles_keyli": {
                  Row: {
                    "created_at": string | null,"email": string,"first_name": string | null,"id": string,"id_number": string | null,"id_validity_date": string | null,"last_name": string | null,"phone": string | null,"photo_url": string | null,"rating_avg": number | null,"role_keyli": Database["public"]['Enums']["user_role_keyli"],"updated_at": string | null,"user_id": string,"verification_date": string | null,"verified": boolean | null
                  }
                  Insert: {
                    "created_at"?: string | null,"email": string,"first_name"?: string | null,"id"?: string,"id_number"?: string | null,"id_validity_date"?: string | null,"last_name"?: string | null,"phone"?: string | null,"photo_url"?: string | null,"rating_avg"?: number | null,"role_keyli"?: Database["public"]['Enums']["user_role_keyli"],"updated_at"?: string | null,"user_id": string,"verification_date"?: string | null,"verified"?: boolean | null
                  }
                  Update: {
                    "created_at"?: string | null,"email"?: string,"first_name"?: string | null,"id"?: string,"id_number"?: string | null,"id_validity_date"?: string | null,"last_name"?: string | null,"phone"?: string | null,"photo_url"?: string | null,"rating_avg"?: number | null,"role_keyli"?: Database["public"]['Enums']["user_role_keyli"],"updated_at"?: string | null,"user_id"?: string,"verification_date"?: string | null,"verified"?: boolean | null
                  }
                  Relationships: [
                    
                  ]
                },"properties_keyli": {
                  Row: {
                    "accepte_depassement": boolean,"agent_id": string | null,"archived_at": string | null,"area_m2": number | null,"bathrooms": number | null,"city": string,"contacts_count": number | null,"created_at": string | null,"description": string | null,"furnished": boolean | null,"geolocation": unknown,"id": string,"is_verified": boolean | null,"main_image_url": string | null,"owner_id": string,"price": number,"quartier_id": string | null,"rooms": number | null,"status": Database["public"]['Enums']["property_status_keyli"],"title": string,"type": Database["public"]['Enums']["property_type_keyli"],"updated_at": string | null,"video_url": string | null,"views_count": number | null
                  }
                  Insert: {
                    "accepte_depassement"?: boolean,"agent_id"?: string | null,"archived_at"?: string | null,"area_m2"?: number | null,"bathrooms"?: number | null,"city": string,"contacts_count"?: number | null,"created_at"?: string | null,"description"?: string | null,"furnished"?: boolean | null,"geolocation": unknown,"id"?: string,"is_verified"?: boolean | null,"main_image_url"?: string | null,"owner_id": string,"price": number,"quartier_id"?: string | null,"rooms"?: number | null,"status": Database["public"]['Enums']["property_status_keyli"],"title": string,"type": Database["public"]['Enums']["property_type_keyli"],"updated_at"?: string | null,"video_url"?: string | null,"views_count"?: number | null
                  }
                  Update: {
                    "accepte_depassement"?: boolean,"agent_id"?: string | null,"archived_at"?: string | null,"area_m2"?: number | null,"bathrooms"?: number | null,"city"?: string,"contacts_count"?: number | null,"created_at"?: string | null,"description"?: string | null,"furnished"?: boolean | null,"geolocation"?: unknown,"id"?: string,"is_verified"?: boolean | null,"main_image_url"?: string | null,"owner_id"?: string,"price"?: number,"quartier_id"?: string | null,"rooms"?: number | null,"status"?: Database["public"]['Enums']["property_status_keyli"],"title"?: string,"type"?: Database["public"]['Enums']["property_type_keyli"],"updated_at"?: string | null,"video_url"?: string | null,"views_count"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "properties_keyli_agent_id_fkey"
      columns: ["agent_id"]
isOneToOne: false
      referencedRelation: "agency_agents_keyli"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "properties_keyli_quartier_id_fkey"
      columns: ["quartier_id"]
isOneToOne: false
      referencedRelation: "quartiers_keyli"
      referencedColumns: ["id"]
    }
                  ]
                },"property_interactions_keyli": {
                  Row: {
                    "created_at": string | null,"id": string,"interaction_type": Database["public"]['Enums']["interaction_type_keyli"],"property_id": string | null,"quartier_id": string | null,"session_id": string,"source": string | null,"user_id": string | null
                  }
                  Insert: {
                    "created_at"?: string | null,"id"?: string,"interaction_type": Database["public"]['Enums']["interaction_type_keyli"],"property_id"?: string | null,"quartier_id"?: string | null,"session_id": string,"source"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"interaction_type"?: Database["public"]['Enums']["interaction_type_keyli"],"property_id"?: string | null,"quartier_id"?: string | null,"session_id"?: string,"source"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "property_interactions_keyli_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties_keyli"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "property_interactions_keyli_quartier_id_fkey"
      columns: ["quartier_id"]
isOneToOne: false
      referencedRelation: "quartiers_keyli"
      referencedColumns: ["id"]
    }
                  ]
                },"property_media_keyli": {
                  Row: {
                    "created_at": string | null,"id": string,"media_type": string | null,"order_index": number | null,"property_id": string | null,"url": string
                  }
                  Insert: {
                    "created_at"?: string | null,"id"?: string,"media_type"?: string | null,"order_index"?: number | null,"property_id"?: string | null,"url": string
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"media_type"?: string | null,"order_index"?: number | null,"property_id"?: string | null,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "property_media_keyli_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties_keyli"
      referencedColumns: ["id"]
    }
                  ]
                },"property_publications_keyli": {
                  Row: {
                    "created_at": string | null,"hors_forfait": boolean,"id": string,"owner_id": string,"prix_depassement": number | null,"property_id": string,"published_at": string,"subscription_id": string | null,"unpublished_at": string | null
                  }
                  Insert: {
                    "created_at"?: string | null,"hors_forfait"?: boolean,"id"?: string,"owner_id": string,"prix_depassement"?: number | null,"property_id": string,"published_at"?: string,"subscription_id"?: string | null,"unpublished_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"hors_forfait"?: boolean,"id"?: string,"owner_id"?: string,"prix_depassement"?: number | null,"property_id"?: string,"published_at"?: string,"subscription_id"?: string | null,"unpublished_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "property_publications_keyli_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties_keyli"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "property_publications_keyli_subscription_id_fkey"
      columns: ["subscription_id"]
isOneToOne: false
      referencedRelation: "subscriptions_keyli"
      referencedColumns: ["id"]
    }
                  ]
                },"quartiers_keyli": {
                  Row: {
                    "commune_id": string,"created_at": string | null,"id": string,"nom": string
                  }
                  Insert: {
                    "commune_id": string,"created_at"?: string | null,"id"?: string,"nom": string
                  }
                  Update: {
                    "commune_id"?: string,"created_at"?: string | null,"id"?: string,"nom"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quartiers_keyli_commune_id_fkey"
      columns: ["commune_id"]
isOneToOne: false
      referencedRelation: "communes_keyli"
      referencedColumns: ["id"]
    }
                  ]
                },"ratings_keyli": {
                  Row: {
                    "comment": string | null,"created_at": string | null,"id": string,"property_id": string,"rated_user_id": string,"rater_id": string,"rating": number | null,"updated_at": string | null
                  }
                  Insert: {
                    "comment"?: string | null,"created_at"?: string | null,"id"?: string,"property_id": string,"rated_user_id": string,"rater_id": string,"rating"?: number | null,"updated_at"?: string | null
                  }
                  Update: {
                    "comment"?: string | null,"created_at"?: string | null,"id"?: string,"property_id"?: string,"rated_user_id"?: string,"rater_id"?: string,"rating"?: number | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ratings_keyli_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties_keyli"
      referencedColumns: ["id"]
    }
                  ]
                },"reports_keyli": {
                  Row: {
                    "created_at": string | null,"id": string,"property_id": string | null,"reason": string,"reporter_id": string,"status": Database["public"]['Enums']["report_status_keyli"] | null,"updated_at": string | null
                  }
                  Insert: {
                    "created_at"?: string | null,"id"?: string,"property_id"?: string | null,"reason": string,"reporter_id": string,"status"?: Database["public"]['Enums']["report_status_keyli"] | null,"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"property_id"?: string | null,"reason"?: string,"reporter_id"?: string,"status"?: Database["public"]['Enums']["report_status_keyli"] | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_keyli_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties_keyli"
      referencedColumns: ["id"]
    }
                  ]
                },"search_alerts_keyli": {
                  Row: {
                    "actif": boolean | null,"created_at": string | null,"criteres": NonNullable<Json>,"derniere_notification_at": string | null,"id": string,"user_id": string
                  }
                  Insert: {
                    "actif"?: boolean | null,"created_at"?: string | null,"criteres": NonNullable<Json>,"derniere_notification_at"?: string | null,"id"?: string,"user_id": string
                  }
                  Update: {
                    "actif"?: boolean | null,"created_at"?: string | null,"criteres"?: NonNullable<Json>,"derniere_notification_at"?: string | null,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"signup_attempts_keyli": {
                  Row: {
                    "completed": boolean | null,"completed_at": string | null,"created_at": string | null,"email": string | null,"error_message": string | null,"first_name": string | null,"id": string,"last_name": string | null,"phone": string | null,"role": string | null,"step_reached": string | null,"user_agent": string | null
                  }
                  Insert: {
                    "completed"?: boolean | null,"completed_at"?: string | null,"created_at"?: string | null,"email"?: string | null,"error_message"?: string | null,"first_name"?: string | null,"id"?: string,"last_name"?: string | null,"phone"?: string | null,"role"?: string | null,"step_reached"?: string | null,"user_agent"?: string | null
                  }
                  Update: {
                    "completed"?: boolean | null,"completed_at"?: string | null,"created_at"?: string | null,"email"?: string | null,"error_message"?: string | null,"first_name"?: string | null,"id"?: string,"last_name"?: string | null,"phone"?: string | null,"role"?: string | null,"step_reached"?: string | null,"user_agent"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"subscriptions_keyli": {
                  Row: {
                    "amount": number,"conditions_negociees": string | null,"created_at": string | null,"end_date": string,"id": string,"montant_depassement_negocie": number | null,"paystack_payment_id": string | null,"plan_id": string,"prix_depassement_negocie": number | null,"start_date": string,"status": Database["public"]['Enums']["subscription_status_keyli"] | null,"updated_at": string | null,"user_id": string
                  }
                  Insert: {
                    "amount": number,"conditions_negociees"?: string | null,"created_at"?: string | null,"end_date": string,"id"?: string,"montant_depassement_negocie"?: number | null,"paystack_payment_id"?: string | null,"plan_id": string,"prix_depassement_negocie"?: number | null,"start_date": string,"status"?: Database["public"]['Enums']["subscription_status_keyli"] | null,"updated_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "amount"?: number,"conditions_negociees"?: string | null,"created_at"?: string | null,"end_date"?: string,"id"?: string,"montant_depassement_negocie"?: number | null,"paystack_payment_id"?: string | null,"plan_id"?: string,"prix_depassement_negocie"?: number | null,"start_date"?: string,"status"?: Database["public"]['Enums']["subscription_status_keyli"] | null,"updated_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_keyli_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans_keyli"
      referencedColumns: ["id"]
    }
                  ]
                },"transactions_keyli": {
                  Row: {
                    "amount": number,"created_at": string | null,"currency": string | null,"id": string,"paystack_ref": string | null,"status": Database["public"]['Enums']["transaction_status_keyli"] | null,"subscription_id": string | null,"user_id": string
                  }
                  Insert: {
                    "amount": number,"created_at"?: string | null,"currency"?: string | null,"id"?: string,"paystack_ref"?: string | null,"status"?: Database["public"]['Enums']["transaction_status_keyli"] | null,"subscription_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string | null,"currency"?: string | null,"id"?: string,"paystack_ref"?: string | null,"status"?: Database["public"]['Enums']["transaction_status_keyli"] | null,"subscription_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "transactions_keyli_subscription_id_fkey"
      columns: ["subscription_id"]
isOneToOne: false
      referencedRelation: "subscriptions_keyli"
      referencedColumns: ["id"]
    }
                  ]
                },"visits_keyli": {
                  Row: {
                    "created_at": string | null,"id": string,"lead_id": string | null,"property_id": string,"scheduled_at": string,"scheduled_by": string,"status": Database["public"]['Enums']["visit_status_keyli"] | null,"visitor_nom": string | null,"visitor_user_id": string | null
                  }
                  Insert: {
                    "created_at"?: string | null,"id"?: string,"lead_id"?: string | null,"property_id": string,"scheduled_at": string,"scheduled_by": string,"status"?: Database["public"]['Enums']["visit_status_keyli"] | null,"visitor_nom"?: string | null,"visitor_user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"lead_id"?: string | null,"property_id"?: string,"scheduled_at"?: string,"scheduled_by"?: string,"status"?: Database["public"]['Enums']["visit_status_keyli"] | null,"visitor_nom"?: string | null,"visitor_user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "visits_keyli_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads_keyli"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visits_keyli_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties_keyli"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "profils_publics_keyli": {
                  Row: {
                    "membre_depuis": string | null,"nom_affiche": string | null,"photo_url": string | null,"rating_avg": number | null,"role_keyli": Database["public"]['Enums']["user_role_keyli"] | null,"user_id": string | null,"verified": boolean | null
                  }
                  Insert: {
                           "membre_depuis"?: string | null,"nom_affiche"?: never,"photo_url"?: string | null,"rating_avg"?: never,"role_keyli"?: Database["public"]['Enums']["user_role_keyli"] | null,"user_id"?: string | null,"verified"?: never
                         }
                        Update: {
                           "membre_depuis"?: string | null,"nom_affiche"?: never,"photo_url"?: string | null,"rating_avg"?: never,"role_keyli"?: Database["public"]['Enums']["user_role_keyli"] | null,"user_id"?: string | null,"verified"?: never
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "a_recu_message_de_keyli":
{ Args: { "p_auteur": string,"p_property": string }; Returns: boolean
                           },
"admin_reviser_document_keyli":
{ Args: { "p_decision": Database["public"]['Enums']["document_status_keyli"],"p_document": string,"p_notes"?: string }; Returns: undefined
                           },
"admin_traiter_signalement_keyli":
{ Args: { "p_note"?: string,"p_report": string,"p_statut": Database["public"]['Enums']["report_status_keyli"] }; Returns: undefined
                           },
"current_user_role_keyli":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role_keyli"]
                           },
"est_admin_keyli":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"est_super_admin_keyli":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"etat_publication_keyli":
{ Args: Record<PropertyKey, never>; Returns: {
              "plan_code": string,"prix_depassement": number,"publications_cycle": number,"seuil_max": number,"statut": string,"subscription_id": string
            }[]
                           },
"evaluer_publication_keyli":
{ Args: { "p_owner": string }; Returns: {
              "plan_code": string,"prix_depassement": number,"publications_cycle": number,"seuil_max": number,"statut": string,"subscription_id": string
            }[]
                           },
"journaliser_keyli":
{ Args: { "p_action": string,"p_details"?: Json,"p_entity_id": string,"p_entity_type": string }; Returns: undefined
                           },
"super_admin_changer_role_keyli":
{ Args: { "p_role": Database["public"]['Enums']["user_role_keyli"],"p_user": string }; Returns: undefined
                           },
"super_admin_formule_negociee_keyli":
{ Args: { "p_conditions": string,"p_montant_depassement_negocie": number,"p_prix_depassement_negocie": number,"p_subscription": string }; Returns: undefined
                           },
"super_admin_modifier_forfait_keyli":
{ Args: { "p_actif": boolean,"p_plan": string,"p_prix_depassement_unitaire": number,"p_prix_mensuel": number,"p_seuil_max": number,"p_seuil_min": number }; Returns: undefined
                           }
          }
          Enums: {
            "document_status_keyli": "pending"|"approved"|"rejected","document_type_keyli": "acd"|"registre"|"extrait_naissance"|"cert_residence","inscription_status_keyli": "en_attente"|"contacte"|"converti"|"rejete","interaction_type_keyli": "view"|"click_contact"|"click_phone"|"click_whatsapp"|"click_favorite"|"click_gallery"|"click_map"|"search_neighborhood","lead_stage_keyli": "nouveau"|"visite_planifiee"|"negociation"|"conclu","priority_level_keyli": "haute"|"moyenne"|"basse","property_status_keyli": "a_louer"|"a_vendre","property_type_keyli": "maison"|"duplex"|"villa"|"appartement"|"studio"|"residence_meublee"|"auberge"|"hotel"|"bureau"|"magasin","report_status_keyli": "pending"|"reviewed"|"resolved","subscription_status_keyli": "active"|"expired"|"canceled","transaction_status_keyli": "pending"|"completed"|"failed","user_role_keyli": "user"|"owner"|"agency"|"admin"|"super_admin","visit_status_keyli": "planifiee"|"effectuee"|"annulee"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "document_status_keyli": ["pending", "approved", "rejected"],"document_type_keyli": ["acd", "registre", "extrait_naissance", "cert_residence"],"inscription_status_keyli": ["en_attente", "contacte", "converti", "rejete"],"interaction_type_keyli": ["view", "click_contact", "click_phone", "click_whatsapp", "click_favorite", "click_gallery", "click_map", "search_neighborhood"],"lead_stage_keyli": ["nouveau", "visite_planifiee", "negociation", "conclu"],"priority_level_keyli": ["haute", "moyenne", "basse"],"property_status_keyli": ["a_louer", "a_vendre"],"property_type_keyli": ["maison", "duplex", "villa", "appartement", "studio", "residence_meublee", "auberge", "hotel", "bureau", "magasin"],"report_status_keyli": ["pending", "reviewed", "resolved"],"subscription_status_keyli": ["active", "expired", "canceled"],"transaction_status_keyli": ["pending", "completed", "failed"],"user_role_keyli": ["user", "owner", "agency", "admin", "super_admin"],"visit_status_keyli": ["planifiee", "effectuee", "annulee"]
          }
        }
} as const

