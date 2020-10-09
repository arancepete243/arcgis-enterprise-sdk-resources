
package com.esri.soap.mapservice;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlType;


/**
 * &lt;p&gt;Java class for anonymous complex type.
 * 
 * &lt;p&gt;The following schema fragment specifies the expected content contained within this class.
 * 
 * &lt;pre&gt;
 * &amp;lt;complexType&amp;gt;
 *   &amp;lt;complexContent&amp;gt;
 *     &amp;lt;restriction base="{http://www.w3.org/2001/XMLSchema}anyType"&amp;gt;
 *       &amp;lt;sequence&amp;gt;
 *         &amp;lt;element name="Result" type="{http://www.esri.com/schemas/ArcGIS/2.6.0}MapImage"/&amp;gt;
 *       &amp;lt;/sequence&amp;gt;
 *     &amp;lt;/restriction&amp;gt;
 *   &amp;lt;/complexContent&amp;gt;
 * &amp;lt;/complexType&amp;gt;
 * &lt;/pre&gt;
 * 
 * 
 */
@XmlAccessorType(XmlAccessType.FIELD)
@XmlType(name = "", propOrder = {
    "result"
})
@XmlRootElement(name = "ExportMapImageResponse")
public class ExportMapImageResponse {

    @XmlElement(name = "Result", required = true)
    protected MapImage result;

    /**
     * Gets the value of the result property.
     * 
     * @return
     *     possible object is
     *     {@link MapImage }
     *     
     */
    public MapImage getResult() {
        return result;
    }

    /**
     * Sets the value of the result property.
     * 
     * @param value
     *     allowed object is
     *     {@link MapImage }
     *     
     */
    public void setResult(MapImage value) {
        this.result = value;
    }

}
