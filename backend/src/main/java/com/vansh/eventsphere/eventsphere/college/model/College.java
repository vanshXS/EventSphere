package com.vansh.eventsphere.eventsphere.college.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "college")
@Data 
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class College {

    @Id
    private String id;
    
    private String name;

    @Indexed(unique = true)
    private String code;

}
